---
layout: post
title: "Graphs Pattern"
date: 2026-08-22 09:49 +0300
tags: [algorithms, graphs, topological sort, union find, leetcode]
categories: [algorithms, coding interview patterns]
---

Most graph problems on LeetCode boil down to one of a handful of questions: is there a valid ordering of these things given their dependencies, is there a path from A to B, or are these things connected at all. I've been working through the `Graphs` folder in my [LeetCodePatterns](https://github.com/islamumarov/LeetCodePatterns) repo, and two tools keep showing up: **topological sort** (Kahn's algorithm) for "ordering with dependencies" problems, and **Union-Find** for "are these connected" problems. This post walks through both, with the actual C# I wrote.

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">
<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

## Course Schedule (LC 207)

The problem: you're given `numCourses` and a list of prerequisite pairs `[a, b]` meaning "to take course `a`, you must first take course `b`". Can you finish all the courses? This is really just asking: is the dependency graph acyclic? If there's a cycle, you can never satisfy the prerequisites.

```csharp
public class CourseSchedule
{
    // topological sort
    public static bool CanFinish(int numCourses, int[][] prerequisites)
    {
        if (prerequisites.Length == 0) return true;
        var sources = new int[numCourses];
        var graph = new Dictionary<int, List<int>>();
        var n = prerequisites.Length;
        var m = prerequisites[0].Length;

        foreach (int[] prerequisite in prerequisites)
        {
            if (!graph.ContainsKey(prerequisite[1]))
            {
                graph[prerequisite[1]] = [];
            }
            graph[prerequisite[1]].Add(prerequisite[0]);
            sources[prerequisite[0]]++;
        }

        var queue = new Queue<int>();
        for (int i = 0; i < sources.Length; i++)
        {
            if (sources[i] == 0)
                queue.Enqueue(i);
        }

        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            numCourses--;
            if (!graph.TryGetValue(node, out List<int>? value)) continue;
            foreach (int i in value)
            {
                sources[i]--;
                if (sources[i] == 0)
                {
                    queue.Enqueue(i);
                }
            }
        }

        return numCourses == 0;
    }
}
```

This is Kahn's algorithm. `sources` is the indegree array — for each course, how many prerequisites it still has outstanding. You build the graph so an edge points from a prerequisite to the course that depends on it, then seed a queue with every course that has indegree 0 (nothing blocking it). Then you repeatedly pop a course off the queue, "remove" it from the graph by decrementing the indegree of everything it unlocks, and push any course whose indegree just hit 0. If you manage to pop every course this way, `numCourses` counts down to 0 and there was no cycle. If a cycle exists, some courses never reach indegree 0 and get stranded outside the queue forever — `numCourses` stays positive and you return `false`.

Complexity is O(V + E): every course is enqueued/dequeued once, and every edge is inspected once when decrementing indegrees.

(There's a second, broken attempt at this same problem further down in that file — a recursive cycle-detection `Solution` class whose `CreateAdjacencyList` never initializes the per-node lists before calling `.Add` on them, so it throws a `NullReferenceException` before it does anything useful. I'm skipping it here; the Kahn's-algorithm version above is the one that actually works.)

## Course Schedule II (LC 210)

Same setup, but now instead of a yes/no answer you need to return *a* valid order to take the courses in (any valid order is accepted, or an empty array if it's impossible).

```csharp
public class CourseSchedule2
{
    public int[] FindOrder(int numCourses, int[][] prerequisites) {

        if(prerequisites.Length == 0) return Enumerable.Range(0, numCourses).ToArray();
        var sources = new int[numCourses];
        var graph = new Dictionary<int, List<int>>();
        var n = prerequisites.Length;
        var m = prerequisites[0].Length;

        foreach (int[] prerequisite in prerequisites)
        {
            if (!graph.ContainsKey(prerequisite[1]))
            {
                graph[prerequisite[1]] = [];
            }
            graph[prerequisite[1]].Add(prerequisite[0]);
            sources[prerequisite[0]]++;
        }
        var order = new int[numCourses];
        var queue = new Queue<int>();
        for (int i = 0; i < sources.Length; i++)
        {
            if (sources[i] == 0)
                queue.Enqueue(i);
        }

        int j = 0;
        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            order[j] = node;
            j++;
            numCourses--;
            if (!graph.TryGetValue(node, out List<int>? value)) continue;
            foreach (int i in value)
            {
                sources[i]--;
                if (sources[i] == 0)
                {
                    queue.Enqueue(i);
                }
            }
        }

        return numCourses == 0 ? order : [];
    }
}
```

It's the exact same Kahn's algorithm as Course Schedule — same indegree array, same queue seeding, same "pop and decrement neighbors" loop. The only addition is a `j` counter that records each popped node into `order` as it comes off the queue. Since the queue only ever pops nodes with indegree 0, the sequence you record is guaranteed to respect every dependency. If a cycle blocks some courses from ever reaching indegree 0, `numCourses` never hits 0 and you return an empty array instead of a half-finished order.

## Union-Find

The other recurring tool is Union-Find (Disjoint Set Union) — for questions like "how many connected groups are there" or "would adding this edge create a cycle", where you don't care about ordering at all, just about which things are already in the same group.

```csharp
public class UnionFind
{
    private int[] _sizeOfDs;
    private int[] _dSet;
    private int _size;
    public int _numComponents;
    public UnionFind(int size)
    {
        if(size <= 0) throw new ArgumentException();
        this._dSet = new int[size];
        this._sizeOfDs = new int[size];

        for (int i = 0; i < size; i++)
        {
            this._dSet[i] = i;
            this._sizeOfDs[i] = 1;
        }
        _numComponents = size;
    }

    public int Find(int p)
    {
        var x = p;
        while (_dSet[x] != x)
        {
            x = _dSet[x];
        }

        // compress
        while (p != x)
        {
            int next = _dSet[p];
            _dSet[p] = x;
            p = next;
        }

        return x;
    }

    public bool Union(int x, int y)
    {
        x = Find(x);
        y = Find(y);
        if(x == y) return false;
        if (_sizeOfDs[x] >= _sizeOfDs[y])
        {
            _dSet[y] = x;
            _sizeOfDs[x] += _sizeOfDs[y];
        }
        else
        {
            _dSet[x] = y;
            _sizeOfDs[y] += _sizeOfDs[x];
        }
        _numComponents--;
        return true;
    }

    public bool IsConnected(int p, int q)
    {
        return Find(p) == Find(q);
    }
}
```

`Find` walks up parent pointers until it hits a root (a node that points to itself), then does a second pass — the "compress" loop — that repoints every node it just walked through directly to that root. So the very first `Find` on a long chain pays for the walk, but every future `Find` on any of those nodes is nearly a single lookup. `Union` finds both roots and, if they differ, attaches the smaller tree under the bigger tree's root (union-by-size, tracked in `_sizeOfDs`), which keeps trees from growing tall in the first place. Together, path compression plus union-by-size gets you amortized near-O(1) per operation (technically O(inverse Ackermann(n)), which is unbeatably close to constant for any input size you'll ever see). This isn't tied to one specific problem in the repo — it's the reusable building block I'd reach for on something like LC 547 "Number of Provinces" or LC 684 "Redundant Connection".

## Try it: Kahn's algorithm, step by step

Here's the topological sort from Course Schedule running on a small sample: 5 courses, prerequisites `[[1,0],[2,0],[3,1],[3,2],[4,3]]` — course 0 has no prerequisites, and course 4 sits at the end of the whole chain.

<div class="algoviz-wrap" id="viz-graphs"></div>
<p class="algoviz-caption">Blue = ready to take (indegree 0, sitting in the queue). Amber = course just dequeued and processed this step. Green = placed in the final order, with its position number below it.</p>

<script>
(function () {
  var nodePos = {
    0: { x: 60,  y: 160 },
    1: { x: 190, y: 70 },
    2: { x: 190, y: 250 },
    3: { x: 320, y: 160 },
    4: { x: 440, y: 160 }
  };
  var edgeList = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
  var numCourses = 5;

  // Mirror the C# CanFinish logic to build the graph + indegree array.
  var graph = {};
  var indegree0 = {};
  for (var i = 0; i < numCourses; i++) indegree0[i] = 0;
  edgeList.forEach(function (e) {
    var from = e[0], to = e[1];
    if (!graph[from]) graph[from] = [];
    graph[from].push(to);
    indegree0[to]++;
  });

  // Run Kahn's algorithm once, snapshotting a step at every dequeue and every relax.
  var steps = [];
  var queue = [];
  var order = [];
  var indeg = Object.assign({}, indegree0);
  for (var k = 0; k < numCourses; k++) if (indeg[k] === 0) queue.push(k);

  steps.push({ queue: queue.slice(), processing: null, order: order.slice(), indegree: Object.assign({}, indeg) });

  while (queue.length > 0) {
    var node = queue.shift();
    steps.push({ queue: queue.slice(), processing: node, order: order.slice(), indegree: Object.assign({}, indeg) });
    order.push(node);
    (graph[node] || []).forEach(function (nb) {
      indeg[nb]--;
      if (indeg[nb] === 0) queue.push(nb);
    });
    steps.push({ queue: queue.slice(), processing: null, order: order.slice(), indegree: Object.assign({}, indeg) });
  }

  var BLUE = '#4C8BF5', AMBER = '#E8871E', GREEN = '#2FA84F';

  function drawArrow(ctx, from, to, color) {
    var dx = to.x - from.x, dy = to.y - from.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len;
    var r = 22;
    var sx = from.x + ux * r, sy = from.y + uy * r;
    var ex = to.x - ux * r, ey = to.y - uy * r;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    var ah = 8;
    var angle = Math.atan2(ey - sy, ex - sx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ah * Math.cos(angle - Math.PI / 6), ey - ah * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(ex - ah * Math.cos(angle + Math.PI / 6), ey - ah * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 320;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var fg = getComputedStyle(document.body).color;

    edgeList.forEach(function (e) {
      drawArrow(ctx, nodePos[e[0]], nodePos[e[1]], fg);
    });

    for (var n = 0; n < numCourses; n++) {
      var p = nodePos[n];
      var color = fg;
      if (step.processing === n) color = AMBER;
      else if (step.order.indexOf(n) !== -1) color = GREEN;
      else if (step.queue.indexOf(n) !== -1) color = BLUE;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), p.x, p.y);

      var orderIdx = step.order.indexOf(n);
      if (orderIdx !== -1) {
        ctx.font = '12px sans-serif';
        ctx.fillText('#' + (orderIdx + 1), p.x, p.y + 34);
      }
    }

    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('queue: [' + step.queue.join(', ') + ']', 12, 300);
    ctx.fillText('order: [' + step.order.join(', ') + ']', 260, 300);
  }

  AlgoViz.mount(document.getElementById('viz-graphs'), { steps: steps, render: render, initialSpeed: 700 });
})();
</script>

## Takeaways

Almost every "graph" question I've hit so far reduces to one of these two shapes: does an ordering exist (topological sort / Kahn's), or are these two things in the same group (Union-Find). Kahn's algorithm is really just BFS with an indegree counter standing in for "have all my dependencies been satisfied yet". Union-Find's whole trick is laziness paying off twice — path compression makes future lookups cheap, and union-by-size stops the tree from getting deep enough to need compressing much in the first place. Next up: applying these to weighted graphs (Dijkstra, MST) once I get there in the repo.
