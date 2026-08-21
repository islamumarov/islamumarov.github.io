---
layout: post
title: "DFS & BFS Pattern"
date: 2026-08-22 09:42 +0300
tags: [algorithms, dfs, bfs, trees, graphs, leetcode]
categories: [algorithms, coding interview patterns]
---

DFS and BFS are the two ways to walk a tree or graph, and most "tree problem" or "graph problem" on LeetCode is really just picking the right one of these two and bolting a little extra logic on top.

- **DFS (depth-first)** — go as deep as you can down one branch before backing out. Natural fit whenever the answer depends on a full path from root to leaf, or you're trying every combination/split (backtracking-flavored problems).
- **BFS (breadth-first)** — go wide, level by level, using a queue. Natural fit whenever you care about "shortest" anything, or you're processing things in waves where each wave unlocks the next (classic multi-source BFS).

I've been going through the `DFS.BFS` folder in my [LeetCodePatterns](https://github.com/islamumarov/LeetCodePatterns) repo and wanted to write up what I actually implemented — including the parts that are a bit rough around the edges. Below are four solved problems, one that's honestly still half-solved, and a small interactive visualization at the end.

## Same Tree (LC 100)

> Given the roots of two binary trees, check if they are the same tree — structurally identical and with the same node values.

```csharp
public class TreeNode(int val, TreeNode left = null, TreeNode right = null)
{
    public int val { get; set; } = val;
    public TreeNode left { get; set; } = left;
    public TreeNode right { get; set; } = right;
}

public class IsTheSameTree
{
    public static bool IsSameTree(TreeNode p, TreeNode q)
    {
        var check = (TreeNode? p1, TreeNode? q1) => p1?.val == q1?.val;

        var dequeue = new Queue<(TreeNode?,TreeNode?)>();
        dequeue.Enqueue((p, q));

        while (dequeue.Count > 0)
        {
            var (p2, q2) = dequeue.Dequeue();
            if(!check(p2, q2)) return false;

            if (p2 is not null)
            {
                dequeue.Enqueue((p2?.left, q2?.left));
                dequeue.Enqueue((p2?.right, q2?.right));
            }
        }

        return true;
    }
}
```

Funny thing: this file lives in the `DFS` folder, but it's actually BFS — a queue of node-pairs, draining level by level. I enqueue `(p, q)` as a pair instead of walking each tree separately, so I only ever need one queue instead of trying to keep two traversals in sync. Every dequeue compares one pair; if the values don't match (including one side being `null` and the other not) it bails out immediately. Time and space are both `O(n)` where `n` is the smaller tree's node count — every node gets visited and queued at most once.

## Minimum Path Sum (LC 64)

> Given a grid of non-negative numbers, find the path from top-left to bottom-right that minimizes the sum of numbers along the path (you can only move right or down).

```csharp
public static int MinPathSum(int[][] grid)
{
    var n = grid.Length;
    var m = grid[0].Length;

    for (var i = n - 1; i >= 0; i--)
    for (var j = m - 1; j >= 0; j--)
    {
        var minLeft = j + 1 == m ? int.MaxValue : grid[i][j + 1];
        var minTop = i + 1 == n ? int.MaxValue : grid[i + 1][j];
        var min = Math.Min(minLeft, minTop);
        grid[i][j] += min == int.MaxValue ? 0 : min;
    }

    return grid[0][0];
}
```

This one's implemented as bottom-up DP rather than an explicit DFS, but conceptually it's the same "explore paths through a grid" shape you'd get from a DFS/memoization solution — I just flipped it to fill the grid in-place starting from the bottom-right corner, so each cell only needs to look at the cell to its right and the cell below (both already finalized by the time we get to it). No recursion, no visited set, no extra memo table — the grid itself doubles as the memo. `O(n·m)` time, `O(1)` extra space since it mutates `grid` directly.

## Concatenated Words (LC 472)

> Given a list of words (no duplicates), return every word that can be formed by concatenating at least two other words from the same list.

```csharp
public static IList<string> FindAllConcatenatedWordsInADict(string[] words) {
    var wordSet = new HashSet<string>(words);

    var result = new List<string>();
    foreach (var word in words)
    {
        if(DFS(word, wordSet))
            result.Add(word);
    }

    return result;
}

public static bool DFS(string word, HashSet<string> wordSet)
{
    for (int i = 1; i < word.Length; i++)
    {
        var prefix = word.Substring(0, i);
        var suffix = word.Substring(i);

        if(wordSet.Contains(prefix) && wordSet.Contains(suffix))
            return true;
        if(wordSet.Contains(prefix) && DFS(suffix, wordSet))
            return true;
        if(wordSet.Contains(suffix) && DFS(prefix, wordSet))
            return true;

    }
    return false;
}
```

This is the "try every split point" flavor of DFS: for each word, walk every prefix/suffix split, and recurse into whichever half isn't a directly-known word. If both halves eventually bottom out in known words, the original word is concatenated.

Honest caveat: there's no memoization here. `DFS` can re-derive whether the same substring is "buildable" over and over across different split points and different calling words, so on adversarial inputs (lots of overlapping substrings) this can get slow — worst case is exponential-ish rather than the polynomial time you'd get with a memo. The straightforward fix is a `Dictionary<string, bool>` cache keyed by substring so each one is only resolved once. That's next on my list for this file — right now it's correct, just not fast in the worst case.

## Maximum Candies From Boxes (LC 1298)

> You start with some boxes; each box may be locked or open, may contain candies, keys to other boxes, and/or more boxes inside it. Open every box you can (using keys you find along the way) and return the max candies you can collect.

```csharp
public class MaximumCandiesFromBoxes
{
    public int MaxCandies(
        int[] status,
        int[] candies,
        int[][] keys,
        int[][] containedBoxes,
        int[] initialBoxes
    )
    {
        int n = status.Length;
        bool[] canOpen = new bool[n];
        bool[] hasBox = new bool[n];
        bool[] used = new bool[n];

        for (int i = 0; i < n; ++i)
        {
            canOpen[i] = (status[i] == 1);
        }
        Queue<int> q = new Queue<int>();
        int ans = 0;
        foreach (int box in initialBoxes)
        {
            hasBox[box] = true;
            if (canOpen[box])
            {
                q.Enqueue(box);
                used[box] = true;
                ans += candies[box];
            }
        }

        while (q.Count > 0)
        {
            int bigBox = q.Dequeue();
            foreach (int key in keys[bigBox])
            {
                canOpen[key] = true;
                if (!used[key] && hasBox[key])
                {
                    q.Enqueue(key);
                    used[key] = true;
                    ans += candies[key];
                }
            }
            foreach (int box in containedBoxes[bigBox])
            {
                hasBox[box] = true;
                if (!used[box] && canOpen[box])
                {
                    q.Enqueue(box);
                    used[box] = true;
                    ans += candies[box];
                }
            }
        }

        return ans;
    }
}
```

This is textbook multi-source BFS. The "sources" are whichever `initialBoxes` you can already open. Every time you open a box, you might discover a key (unlocking a box you already physically have) or a new box (which might already be unlockable). Either discovery is just another item pushed onto the same queue — the queue keeps draining until nothing new becomes openable. The `used`/`hasBox`/`canOpen` flags exist so a box is only ever counted once even though keys and boxes can arrive in either order. `O(n)` overall since every box and every key is processed a constant number of times.

## Recover Binary Search Tree (LC 99) — still a work in progress

> Two nodes of a BST were swapped by mistake. Recover the tree without changing its structure.

The classic idea: do an in-order traversal of a BST and the values should come out sorted. If exactly two nodes got swapped, the in-order sequence will have one or two places where a value dips below the previous one — from that you can figure out which two values were swapped.

```csharp
private static void InOrder(TreeNode root, List<int> arr)
{
    if (root is null)
    {
        return;
    }

    InOrder(root.left, arr);
    arr.Add(root.val);
    InOrder(root.right, arr);
}

private static (int?, int?) GetSwapValues(List<int> arr)
{
     (int? x, int? y) = (null, null);
    for (int i = 0; i < arr.Count-1; i++)
    {
        if (arr[i + 1] < arr[i])
        {
            y = arr[i + 1];
            if (x is null) x = arr[i];
            else break;
        }
    }

    return (x, y);
}
```

`InOrder` and `GetSwapValues` are the correct, standard approach — I'm happy with this part. The tricky bit is that a swap can produce either one dip (adjacent nodes swapped) or two dips (non-adjacent nodes swapped), and `GetSwapValues` handles both: it grabs the "before" value of the first dip as `x`, and keeps updating `y` to the "after" value of whichever dip it sees, so it lands on the right two values either way.

Where it falls apart is the actual recovery step:

```csharp
private static void Recover(TreeNode? root, int count, int x, int y)
{
    if (root != null)
    {
        if (root.val == x || root.val == y)
        {
            root.val = root.val == x ? y : x;
            count -= 1;
            if(count == 0) return;
        } 
    }
}

public static void RecoverTree(TreeNode root)
{
    var arr = new List<int>();
    InOrder(root, arr);
    var (x, y) = GetSwapValues(arr);

    Recover(root, 2, x.Value!, y.Value!);
}
```

`Recover` only ever looks at the single `root` node it's handed — it never recurses into `root.left` or `root.right`. So in the general case it does *not* walk the tree to find and swap both nodes; it only works if one of the swapped values happens to sit at the exact node passed in. The in-order pass to find the two swapped values is solid; the final recovery step still needs to walk the tree instead of only checking one node — that's next on my list.

## Try it: BFS on Same Tree

Since Same Tree (LC 100) is the cleanest example of the "queue of node-pairs" trick, here's an animated run of it on two identical `[1, 2, 3]` trees, mirroring the C# queue logic above step by step.

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

<div class="algoviz-wrap" id="viz-dfs-bfs"></div>

<script>
(function () {
  // Two sample trees — both [1, 2, 3] — so every pair the BFS dequeues turns out equal.
  const treeA = {
    id: 'a1', val: 1, x: 110, y: 50,
    left:  { id: 'a2', val: 2, x: 60,  y: 150, left: null, right: null },
    right: { id: 'a3', val: 3, x: 160, y: 150, left: null, right: null }
  };
  const treeB = {
    id: 'b1', val: 1, x: 360, y: 50,
    left:  { id: 'b2', val: 2, x: 310, y: 150, left: null, right: null },
    right: { id: 'b3', val: 3, x: 410, y: 150, left: null, right: null }
  };

  const PALETTE = { blue: '#4C8BF5', green: '#2FA84F', red: '#E5484D' };
  const colors = {}; // nodeId -> 'blue' | 'green' | 'red'
  const steps = [];

  function snapshot(activeA, activeB, status, note) {
    steps.push({ colors: Object.assign({}, colors), activeA, activeB, status, note });
  }

  // Mirrors the Queue<(TreeNode,TreeNode)> BFS in IsTheSameTree.cs exactly.
  const queue = [[treeA, treeB]];
  snapshot(null, null, 'start', 'Queue: [(1, 1)]');

  let same = true;
  while (queue.length && same) {
    const [p, q] = queue.shift();
    if (!p && !q) continue; // both null: check(null,null) is true, nothing to expand — skip visually

    snapshot(p ? p.id : null, q ? q.id : null, 'comparing',
      'Comparing ' + (p ? p.val : 'null') + ' vs ' + (q ? q.val : 'null'));

    const equal = (p ? p.val : null) === (q ? q.val : null);
    if (!equal) {
      if (p) colors[p.id] = 'red';
      if (q) colors[q.id] = 'red';
      snapshot(null, null, 'mismatch', 'Mismatch — IsSameTree returns false');
      same = false;
      break;
    }

    if (p) colors[p.id] = 'green';
    if (q) colors[q.id] = 'green';
    snapshot(null, null, 'equal', p.val + ' === ' + q.val + ', values match');

    if (p) {
      queue.push([p.left, q ? q.left : null]);
      queue.push([p.right, q ? q.right : null]);
    }
  }
  if (same) snapshot(null, null, 'done', 'Queue empty — IsSameTree returns true');

  function collectNodes(root, out) {
    if (!root) return out;
    out.push(root);
    collectNodes(root.left, out);
    collectNodes(root.right, out);
    return out;
  }
  const allNodes = collectNodes(treeA, []).concat(collectNodes(treeB, []));

  function drawEdges(ctx, root, fg) {
    if (!root) return;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    if (root.left) { ctx.beginPath(); ctx.moveTo(root.x, root.y); ctx.lineTo(root.left.x, root.left.y); ctx.stroke(); }
    if (root.right) { ctx.beginPath(); ctx.moveTo(root.x, root.y); ctx.lineTo(root.right.x, root.right.y); ctx.stroke(); }
    drawEdges(ctx, root.left, fg);
    drawEdges(ctx, root.right, fg);
  }

  function drawNode(ctx, node, color, fg) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
    ctx.lineWidth = color ? 3 : 1.5;
    ctx.strokeStyle = color || fg;
    ctx.stroke();
    ctx.fillStyle = color || fg;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.val, node.x, node.y);
  }

  function render(stage, step) {
    let canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 230;
      stage.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    const fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawEdges(ctx, treeA, fg);
    drawEdges(ctx, treeB, fg);

    allNodes.forEach((n) => {
      let color = step.colors[n.id] ? PALETTE[step.colors[n.id]] : null;
      if (n.id === step.activeA || n.id === step.activeB) color = PALETTE.blue;
      drawNode(ctx, n, color, fg);
    });

    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.note, 10, canvas.height - 10);
  }

  AlgoViz.mount(document.getElementById('viz-dfs-bfs'), { steps, render, initialSpeed: 700 });
})();
</script>

<p class="algoviz-caption">Blue = node pair currently compared. Green = confirmed equal. Red = mismatch (would stop immediately).</p>

## Takeaways

DFS and BFS both come down to "how do I pick the next node to look at" — a stack (or recursion) for depth-first, a queue for breadth-first. What's interesting going through these five problems is how often the "real" solution isn't a pure recursive DFS or a textbook BFS: `IsSameTree` is BFS despite the folder name, `MinPathSum` is DFS-shaped but implemented as bottom-up DP, and `MaxCandies` is BFS wearing a "unlock boxes" costume. The pattern matters more than the keyword — once you can see "this is level-by-level" or "this is explore-every-branch," the actual code mostly writes itself. The exceptions are the honest ones: no memo in `ConcatenatedWords`, and a `Recover` method in `RecoverBST` that still needs to walk the tree. Both are on the list.
