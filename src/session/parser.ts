import { readFileSync } from 'node:fs';
import type { JSONLMessage, ParsedMessage, ContentBlock } from '../types.js';
import { log } from '../utils/logger.js';

/**
 * Parse a JSONL file and reconstruct the final conversation path via DAG traversal.
 *
 * Algorithm:
 * 1. Parse all lines into messages, build uuid→message map and parent→children index
 * 2. Find leaf nodes (uuids not referenced as parentUuid by any other message)
 * 3. Filter out progress-type leaves (dead ends from hooks)
 * 4. Pick the leaf with the latest timestamp
 * 5. Walk backwards from leaf to root via parentUuid (with logicalParentUuid fallback for compact_boundary)
 * 6. Reverse to get root→leaf order
 * 7. Merge consecutive assistant chunks with same requestId
 */
export function parseSession(filePath: string): ParsedMessage[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  const messages: JSONLMessage[] = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as JSONLMessage);
    } catch {
      // skip malformed JSON lines
    }
  }

  if (messages.length === 0) return [];

  // Build uuid → message map and track which uuids are referenced as parents
  const byUuid = new Map<string, JSONLMessage>();
  const referencedAsParent = new Set<string>();

  for (const msg of messages) {
    // Skip messages without uuid (file-history-snapshot first lines, queue-operation, etc.)
    if (!msg.uuid) continue;
    // Skip sidechain messages (sub-agent conversations)
    if (msg.isSidechain) continue;

    byUuid.set(msg.uuid, msg);

    if (msg.parentUuid) {
      referencedAsParent.add(msg.parentUuid);
    }
  }

  if (byUuid.size === 0) return [];

  // Find leaf nodes: uuids not referenced as parent, excluding progress type
  const leaves: JSONLMessage[] = [];
  for (const [uuid, msg] of byUuid) {
    if (!referencedAsParent.has(uuid) && msg.type !== 'progress') {
      leaves.push(msg);
    }
  }

  if (leaves.length === 0) return [];

  // Pick the leaf with the latest timestamp
  const leaf = leaves.reduce((latest, msg) => {
    if (!latest.timestamp) return msg;
    if (!msg.timestamp) return latest;
    return new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest;
  });

  // Walk backwards from leaf to root
  const path: JSONLMessage[] = [];
  let current: JSONLMessage | undefined = leaf;

  const visited = new Set<string>();
  while (current) {
    if (current.uuid && visited.has(current.uuid)) break; // cycle protection
    if (current.uuid) visited.add(current.uuid);

    path.push(current);

    let next: JSONLMessage | undefined;
    if (current.parentUuid) {
      next = byUuid.get(current.parentUuid);
    }
    // Fallback for compact_boundary: parentUuid is null but logicalParentUuid exists
    if (!next && current.logicalParentUuid) {
      next = byUuid.get(current.logicalParentUuid);
    }
    current = next;
  }

  // Reverse to root→leaf order
  path.reverse();

  // Convert to ParsedMessage
  const parsed = path.map(toParseMessage);

  // Merge consecutive assistant chunks with same requestId
  return mergeAssistantChunks(parsed);
}

function toParseMessage(msg: JSONLMessage): ParsedMessage {
  return {
    type: msg.type,
    role: msg.message?.role,
    content: msg.message?.content ?? '',
    timestamp: msg.timestamp,
    uuid: msg.uuid,
    parentUuid: msg.parentUuid,
    logicalParentUuid: msg.logicalParentUuid,
    isSidechain: msg.isSidechain,
    requestId: msg.requestId,
    cwd: msg.cwd,
  };
}

/**
 * Merge consecutive assistant messages that share the same requestId.
 * Their content blocks are concatenated.
 */
function mergeAssistantChunks(messages: ParsedMessage[]): ParsedMessage[] {
  const result: ParsedMessage[] = [];

  for (const msg of messages) {
    const prev = result[result.length - 1];
    if (
      prev &&
      msg.role === 'assistant' &&
      prev.role === 'assistant' &&
      msg.requestId &&
      msg.requestId === prev.requestId
    ) {
      // Merge content blocks
      const prevBlocks = normalizeContent(prev.content);
      const curBlocks = normalizeContent(msg.content);
      prev.content = [...prevBlocks, ...curBlocks];
    } else {
      result.push(msg);
    }
  }

  return result;
}

function normalizeContent(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return content;
}
