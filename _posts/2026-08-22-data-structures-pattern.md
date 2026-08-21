---
layout: post
title: "Data Structures Pattern: LRU Cache"
date: 2026-08-22 09:56 +0300
tags: [algorithms, data structures, linked list, hash map, leetcode]
categories: [algorithms, coding interview patterns]
---

I've been working through [LeetCode patterns](https://github.com/islamumarov) in a little C# repo, one pattern at a time, and this one is different from the others. Sliding window, two pointers, BFS/DFS — those are all about *traversing* a data structure that already exists. This pattern is about *building* one, when the ones you're handed off the shelf don't quite fit the job.

## The pattern: when neither a hashmap nor a linked list is enough alone

The setup shows up over and over in interviews: "design a data structure that supports X and Y, both in O(1)." A plain array gives you O(1) access by index but O(n) insert/remove in the middle. A plain hashmap gives you O(1) lookup but no sense of order — no way to cheaply say "which entry hasn't been touched in the longest time." A plain linked list gives you O(1) insert/remove once you're holding the node, but O(n) just to find that node in the first place.

The trick is combining two of them: a **hashmap for O(1) lookup** pointing directly at **linked-list nodes for O(1) reordering**. The hashmap tells you *where* something is instantly; the linked list lets you move it, delete it, or reinsert it without shifting anything else around it. Once that clicks, a whole family of "design a cache / design a data structure with eviction" problems stop being scary — they're all this same combination wearing different clothes.

The canonical example, and the one I used to actually internalize it, is LeetCode 146: **LRU Cache**.

## The problem

Design a cache with a fixed capacity that supports two operations, both in O(1) average time:

- `Get(key)` — return the value if the key exists, otherwise -1. If it exists, treat it as just-used.
- `Put(key, value)` — insert or update the value for a key. If this pushes the cache over capacity, evict the **least recently used** entry first.

"Recently used" means either operation touched it — a `Get` counts as a use, not just a `Put`. So the cache needs to track usage order and update it on every single operation, without ever scanning the whole thing.

## Code walkthrough

Here's the actual implementation from my repo (`DataStructures/LruCache.cs`, trimmed of `using`/namespace lines):

```csharp
public class Node
{
    public int key;
    public int value;
    public Node prev;
    public Node next;

    public Node(int key, int value)
    {
        this.key = key;
        this.value = value;
    }
}

public class LRUCache {

    private readonly Dictionary<int, Node> map;
    private readonly int _capacity;

    private readonly Node _head;
    private readonly Node _tail;

    public LRUCache(int capacity) {
        this._capacity = capacity;
        map = new Dictionary<int, Node>();

        _head = new Node(-1, -1);
        _tail = new Node(-1, -1);

        _head.next = _tail;
        _tail.prev = _head;
    }

    // Add node right after head
    private void AddNode(Node node)
    {
        node.next = _head.next;
        node.prev = _head;

        _head.next.prev = node;
        _head.next = node;
    }

    // Remove node from DLL
    private void DeleteNode(Node node)
    {
        Node prevNode = node.prev;
        Node nextNode = node.next;

        prevNode.next = nextNode;
        nextNode.prev = prevNode;
    }

    public int Get(int key) {
        if (!map.TryGetValue(key, out Node? node))
            return -1;

        DeleteNode(node);
        AddNode(node);

        return node.value;
    }

    public void Put(int key, int value) {
        // Key already exists
        if (map.TryGetValue(key, out Node? existingNode))
        {
            existingNode.value = value;

            DeleteNode(existingNode);
            AddNode(existingNode);
        }
        else
        {
            // Cache full
            if (map.Count == _capacity)
            {
                Node lru = _tail.prev;

                DeleteNode(lru);
                map.Remove(lru.key);
            }

            Node newNode = new Node(key, value);

            AddNode(newNode);
            map[key] = newNode;
        }
    }
}
```

A few things worth calling out:

**The sentinel `_head`/`_tail` nodes are the whole trick to keeping this code simple.** Without them, `AddNode` and `DeleteNode` would need special-case branches for "the list is empty," "we're adding at the very front," "we're removing the last real node," and so on — every one of those is a null-check waiting to be forgotten. With two dummy nodes wired together (`_head.next = _tail`, `_tail.prev = _head`) at construction time, the list is *never* actually empty from the code's point of view. There's always a real `prev` and a real `next` to rewire, no matter which node you're touching. Most-recently-used lives right after `_head`; least-recently-used lives right before `_tail`.

**`AddNode` and `DeleteNode` are the only two primitives that touch pointers.** Everything else — `Get`, `Put`, eviction — is built by composing these two: to "move a node to the front," you `DeleteNode` it from wherever it is, then `AddNode` it back right after `_head`. There's no separate "move" function because there doesn't need to be one.

**`Get` promotes on read.** If the key exists, it deletes the node from its current position and re-adds it at the front — that's the "this was just used" signal. If it doesn't exist, it bails out with -1 before touching the list at all.

**`Put` evicts from the tail, not the head.** When the map is already at `_capacity` and the key is new, it grabs `_tail.prev` — the actual least-recently-used node, not a stand-in — deletes it from the list *and* removes it from the map (skipping the map removal here would leak a stale entry that no longer points anywhere in the list), then inserts the new node at the front.

**Complexity:** `Get` and `Put` are both O(1) — dictionary lookup is O(1) average, and `AddNode`/`DeleteNode` only ever touch a fixed number of pointers regardless of list size. Space is O(capacity), since the map and list never hold more than `capacity` entries at once.

## Try it

Here's a capacity-3 cache running a fixed sequence of operations: `put(1,A)`, `put(2,B)`, `put(3,C)`, `get(1)`, `put(4,D)`. Watch how `get(1)` promotes key 1 to the front even though it doesn't change its value, and how `put(4,D)` evicts key 2 — not key 1, even though 1 was inserted before 2 — because key 1 was the one touched most recently.

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">
<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

<div class="algoviz-wrap" id="viz-data-structures"></div>
<p class="algoviz-caption">Blue = node just touched, moving to the front (most recently used). Red = about to be evicted (least recently used, cache was full). Green flash = just landed at the front.</p>

<script>
(function () {
  var CAPACITY = 3;
  var OPS = [
    { type: 'put', key: 1, val: 'A' },
    { type: 'put', key: 2, val: 'B' },
    { type: 'put', key: 3, val: 'C' },
    { type: 'get', key: 1 },
    { type: 'put', key: 4, val: 'D' }
  ];

  // Simulate the same order-of-use bookkeeping the real C# doubly-linked
  // list does, tracking just the front-to-back key order. Two snapshots
  // per op: "touch" (before the move/evict lands) and "settle" (after).
  function simulate(capacity, ops) {
    var order = [];
    var values = {};
    var steps = [{ order: [], values: {}, op: 'start (empty cache)', touched: null, evicted: null }];

    ops.forEach(function (op) {
      var label = op.type === 'get' ? ('get(' + op.key + ')') : ('put(' + op.key + ',' + op.val + ')');

      if (op.type === 'get') {
        if (order.indexOf(op.key) === -1) {
          steps.push({ order: order.slice(), values: Object.assign({}, values), op: label + ' → miss', touched: null, evicted: null });
          return;
        }
        steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: op.key, evicted: null });
        order = order.filter(function (k) { return k !== op.key; });
        order.unshift(op.key);
        steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: op.key, evicted: null });
        return;
      }

      // put
      values[op.key] = op.val;
      var exists = order.indexOf(op.key) !== -1;
      if (exists) {
        steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: op.key, evicted: null });
        order = order.filter(function (k) { return k !== op.key; });
        order.unshift(op.key);
        steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: op.key, evicted: null });
        return;
      }

      var evicted = null;
      if (order.length === capacity) {
        evicted = order[order.length - 1];
        steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: null, evicted: evicted });
        order = order.slice(0, order.length - 1);
        delete values[evicted];
      }
      order.unshift(op.key);
      steps.push({ order: order.slice(), values: Object.assign({}, values), op: label, touched: op.key, evicted: null });
    });

    return steps;
  }

  var steps = simulate(CAPACITY, OPS);

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 220;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var fg = getComputedStyle(document.body).color;
    var BLUE = '#4C8BF5';
    var RED = '#E5484D';
    var GREEN = '#2FA84F';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Op label at the top
    ctx.font = '600 15px sans-serif';
    ctx.fillStyle = fg;
    ctx.fillText(step.op, canvas.width / 2, 24);

    var rowY = 100;
    var boxH = 60;
    var boxW = 74;
    var gap = 14;

    function drawBox(x, label, sub, color, fillAlpha) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      if (fillAlpha) {
        ctx.globalAlpha = fillAlpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, rowY - boxH / 2, boxW, boxH);
        ctx.globalAlpha = 1;
      }
      ctx.strokeRect(x, rowY - boxH / 2, boxW, boxH);
      ctx.fillStyle = color;
      ctx.font = '600 16px sans-serif';
      ctx.fillText(label, x + boxW / 2, rowY - 8);
      ctx.font = '13px sans-serif';
      ctx.fillText(sub, x + boxW / 2, rowY + 14);
    }

    function drawArrow(x1, x2) {
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, rowY);
      ctx.lineTo(x2, rowY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, rowY);
      ctx.lineTo(x2 - 6, rowY - 4);
      ctx.lineTo(x2 - 6, rowY + 4);
      ctx.closePath();
      ctx.fillStyle = fg;
      ctx.fill();
    }

    // Build the full row: HEAD, then order (front..back), possibly the
    // evicted node still lingering at the back, then TAIL.
    var nodes = step.order.map(function (k) {
      return { label: 'key ' + k, sub: step.values[k] != null ? ('val ' + step.values[k]) : '', color: fg };
    });
    if (step.evicted != null) {
      nodes.push({ label: 'key ' + step.evicted, sub: 'evicting…', color: RED, fillAlpha: 0.15, isEvicted: true });
    }

    var headW = 60;
    var totalW = headW + nodes.length * (boxW + gap) + headW;
    var startX = (canvas.width - totalW) / 2;

    // HEAD sentinel
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(startX, rowY - boxH / 2, headW, boxH);
    ctx.setLineDash([]);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = fg;
    ctx.fillText('HEAD', startX + headW / 2, rowY);

    var x = startX + headW;
    var prevRightEdge = startX + headW;
    var frontX = null;

    nodes.forEach(function (n, i) {
      var color = n.color;
      var fillAlpha = n.fillAlpha || 0;
      var key = step.order[i];

      if (n.isEvicted) {
        color = RED;
        fillAlpha = 0.2;
      } else if (step.touched === key) {
        // touched node: green flash if it's already sitting at the front
        // (the "settle" snapshot), blue otherwise (the "touch" snapshot).
        color = (i === 0) ? GREEN : BLUE;
        fillAlpha = 0.15;
      }

      drawArrow(prevRightEdge, x);
      drawBox(x, n.label, n.sub, color, fillAlpha);
      if (i === 0) frontX = x;
      prevRightEdge = x + boxW;
      x += boxW + gap;
    });

    drawArrow(prevRightEdge, x);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, rowY - boxH / 2, headW, boxH);
    ctx.setLineDash([]);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = fg;
    ctx.fillText('TAIL', x + headW / 2, rowY);

    // MRU / LRU labels under the ends
    ctx.font = '11px sans-serif';
    ctx.globalAlpha = 0.7;
    if (frontX != null) {
      ctx.fillText('← most recently used', startX + headW + boxW / 2 + 20, rowY + boxH / 2 + 18);
      ctx.fillText('least recently used →', x - boxW / 2 - 20, rowY + boxH / 2 + 18);
    }
    ctx.globalAlpha = 1;
  }

  AlgoViz.mount(document.getElementById('viz-data-structures'), { steps: steps, render: render, initialSpeed: 900 });
})();
</script>

## Takeaways

The big idea isn't really about caches specifically — it's that when a problem demands two different O(1) capabilities that no single built-in structure gives you both of, look for a pair that covers each other's weak spot. Hashmap for "find it instantly," linked list for "reorder it instantly," sentinels so the edges of the list don't need special-casing. Once I had that combination in my head, a handful of other "design X with these constraints" problems (LFU cache, browser history, that kind of thing) stopped feeling like new problems and started feeling like the same two Lego pieces snapped together differently.
