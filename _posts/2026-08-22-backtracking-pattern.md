---
layout: post
title: "Backtracking Pattern"
date: 2026-08-22 09:35 +0300
tags: [algorithms, backtracking, recursion, leetcode]
categories: [algorithms, coding interview patterns]
---

Next up in the pattern run-through: Backtracking. This one always felt more like "structured brute force" to me than a clever trick, and honestly that's kind of the point.

## What the pattern is

Backtracking is DFS over a tree of decisions, with an explicit undo step. At every node you:

1. make a choice (add something to the current path),
2. recurse into the consequences of that choice,
3. undo the choice ("un-choose") before trying the next option at that level.

That third step is the whole pattern. Without it you'd just be doing plain recursion that only ever explores one branch. The undo is what lets you reuse the same `path` variable (a stack, a list, whatever) across every branch instead of allocating a fresh copy at each level — you build it up, look at it, then tear it back down to try the sibling option.

It shows up whenever the problem wants "all possible X" — all subsets, all permutations, all combinations, all valid board placements — where the search space branches but a lot of branches can share the same in-progress state.

## The problem

LeetCode 78, "Subsets." Given an array of distinct integers, return every possible subset (the power set), including the empty set and the full array itself. Order of subsets doesn't matter, order of elements within a subset doesn't matter, no duplicates.

For `[1,2,3]` there are `2^3 = 8` subsets:

```
[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]
```

Every element is either in a given subset or it isn't — that binary choice per element is exactly what backtracking (or, as we'll see, a non-recursive equivalent) is built to enumerate.

## Code walkthrough A: the recursive backtracking version

This is `Subsets` from `Subsets78.cs` in my `Backtracking` folder, untouched:

```csharp
public static IList<IList<int>> Subsets(int[] nums)
{
    var result = new List<IList<int>>();
    var curPath = new Stack<int>();
    void Backtrack(int start)
    {
        result.Add(curPath.ToList());

        for (int i = start; i < nums.Length; i++)
        {
            curPath.Push(nums[i]);
            Backtrack(i + 1);
            curPath.Pop();
        }
    }

    Backtrack(0);

    return result;
}
```

The first line inside `Backtrack` is the one that took me a moment to appreciate: **every call records the current path before doing anything else.** That's because every prefix built so far — including the empty one on the very first call — is itself a valid subset. There's no separate "base case check the length" logic, because there's no fixed length to reach; every node in the recursion tree is a valid answer, not just the leaves.

Then the loop is the classic push → recurse → pop:

- **push** — try including `nums[i]` in the path,
- **recurse** — call `Backtrack(i + 1)`, so the next choice only ever looks *forward* from `i`. That's what stops `[1,2]` and `[2,1]` from both showing up as separate subsets — since order doesn't matter for a subset, we only ever extend to the right.
- **pop** — undo the choice, so the next iteration of the loop tries the next number starting from a clean `curPath` again.

`curPath` is a single mutable `Stack<int>` shared across the whole recursion. That's the memory-efficient part of backtracking: instead of passing a new list down at every call, you mutate one and repair it on the way back up. The `curPath.ToList()` in the record step is a defensive copy — without it, every entry in `result` would be a reference to the same stack, which gets mutated right out from under you as the recursion continues.

## Code walkthrough B: the iterative "cascading" version

Same file, `Subsets2`, a completely different mental model:

```csharp
public static IList<IList<int>> Subsets2(int[] nums)
{
    var res = new List<IList<int>>();
    res.Add(new List<int>());

    foreach (var t in nums)
    {
        var size = res.Count;
        for (int j = 0; j < size; j++)
        {
            List<int> subset = new List<int>(res[j]);
            subset.Add(t);
            res.Add(subset);
        }
    }

    return res;
}
```

Start with just the empty set. For each new number, look at every subset already in the result list, clone it, and append the new number to the clone. Since the result starts at size 1 and doubles every time a number is processed (`1 → 2 → 4 → 8` for three numbers), you end up with the same `2^n` subsets, in a different order.

The key trick to notice: `size` is captured *before* the inner loop starts, so you're only ever doubling the subsets that existed before this number was considered — you're not iterating over the new ones you just added in the same pass (that would spiral into an infinite doubling).

Is this "backtracking"? Not really, not in the undo sense — there's no push/pop, no shared mutable path, no recursion. It's an incremental build: each step takes the previous answer and grows it. Same output as part A, same underlying binary-choice-per-element idea, but no decision tree being walked and rewound — just a list getting doubled three times.

One more thing sitting in the same folder: Combination Sum (LC 39) is queued up next but isn't implemented yet, so no code for it here.

## Try it

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

Below is the recursive `Subsets` method running on `[1, 2, 3]` — it's the one that actually shows the push/recurse/pop shape. Step through it or hit play. The path on top is the live stack; the list below fills in as each path gets recorded, flashing green the instant it happens, and an amber ghost box shows whatever just got popped during backtrack.

<div class="algoviz-wrap" id="viz-backtracking"></div>
<p class="algoviz-caption">Blue = current path. Green flash = a subset just recorded. Amber = backtracking (popping the last choice).</p>

<script>
(function () {
  var nums = [1, 2, 3];

  var BLUE = '#4C8BF5';
  var GREEN = '#2FA84F';
  var AMBER = '#E8871E';

  // Precompute every step by literally tracing the recursion, mirroring
  // the C# logic: record the path first, then loop push/recurse/pop.
  var steps = [];
  var curPath = [];
  var subsets = [];

  function snapshot(event, highlightIndex, value) {
    steps.push({
      path: curPath.slice(),
      subsets: subsets.map(function (s) { return s.slice(); }),
      event: event,
      highlightIndex: highlightIndex,
      value: value
    });
  }

  function backtrack(start) {
    subsets.push(curPath.slice());
    snapshot('record', null, null);

    for (var i = start; i < nums.length; i++) {
      curPath.push(nums[i]);
      snapshot('push', curPath.length - 1, nums[i]);
      backtrack(i + 1);
      var popped = curPath.pop();
      snapshot('pop', curPath.length, popped);
    }
  }

  backtrack(0);

  function fmtSubset(s) {
    return '{' + s.join(',') + '}';
  }

  function render(stage, step, index, total) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 520;
      canvas.height = 320;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var pad = 16;
    var boxSize = 34;
    var boxGap = 8;

    // --- status line ---
    ctx.fillStyle = fg;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    var statusText =
      step.event === 'record' ? 'record current path as a subset' :
      step.event === 'push' ? 'push ' + step.value + ' onto path, recurse' :
      'pop ' + step.value + ' — backtrack';
    ctx.fillText(statusText, pad, pad);

    // --- current path row ---
    var pathY = pad + 26;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.75;
    ctx.fillText('current path:', pad, pathY);
    ctx.globalAlpha = 1;

    var boxesTop = pathY + 10;
    var x = pad;
    for (var i = 0; i < step.path.length; i++) {
      var isNew = step.event === 'push' && i === step.highlightIndex;
      ctx.fillStyle = isNew ? BLUE : 'transparent';
      ctx.globalAlpha = isNew ? 0.25 : 1;
      if (isNew) ctx.fillRect(x, boxesTop, boxSize, boxSize);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, boxesTop, boxSize, boxSize);
      ctx.lineWidth = 1;
      ctx.fillStyle = fg;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(step.path[i]), x + boxSize / 2, boxesTop + boxSize / 2 + 5);
      x += boxSize + boxGap;
    }

    // ghost box for the just-popped value
    if (step.event === 'pop') {
      ctx.strokeStyle = AMBER;
      ctx.fillStyle = AMBER;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, boxesTop, boxSize, boxSize);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, boxesTop, boxSize, boxSize);
      ctx.lineWidth = 1;
      ctx.fillStyle = AMBER;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(step.value), x + boxSize / 2, boxesTop + boxSize / 2 + 5);
    }

    if (step.path.length === 0 && step.event !== 'pop') {
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.6;
      ctx.font = 'italic 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('(empty)', x, boxesTop + boxSize / 2 + 5);
      ctx.globalAlpha = 1;
    }

    // --- subsets found list ---
    var listTop = boxesTop + boxSize + 26;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.75;
    ctx.fillText('subsets recorded so far (' + step.subsets.length + ' / 8):', pad, listTop);
    ctx.globalAlpha = 1;

    var chipY = listTop + 14;
    var chipX = pad;
    var chipH = 24;
    ctx.font = '12px sans-serif';
    for (var s = 0; s < step.subsets.length; s++) {
      var label = fmtSubset(step.subsets[s]);
      var w = ctx.measureText(label).width + 16;
      if (chipX + w > canvas.width - pad) {
        chipX = pad;
        chipY += chipH + 8;
      }
      var isLatest = step.event === 'record' && s === step.subsets.length - 1;
      ctx.strokeStyle = isLatest ? GREEN : fg;
      ctx.globalAlpha = isLatest ? 1 : 0.5;
      ctx.lineWidth = isLatest ? 2 : 1;
      if (isLatest) {
        ctx.fillStyle = GREEN;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(chipX, chipY, w, chipH);
        ctx.globalAlpha = 1;
      }
      ctx.strokeRect(chipX, chipY, w, chipH);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
      ctx.fillStyle = isLatest ? GREEN : fg;
      ctx.textAlign = 'center';
      ctx.fillText(label, chipX + w / 2, chipY + 16);
      chipX += w + 8;
    }
  }

  AlgoViz.mount(document.getElementById('viz-backtracking'), { steps: steps, render: render, initialSpeed: 550 });
})();
</script>

## Takeaways

- There are `2^n` subsets of an `n`-element set — one for every element being in-or-out — so any correct solution has to produce that many results no matter how it's structured.
- The recursive version does `O(n)` work per subset (the `ToList()` copy), for `O(n · 2^n)` total; the iterative doubling version pays the same `O(n)` copy per subset for the same total, it just gets there without a call stack.
- The two solutions are a nice reminder that "backtracking" describes *how you search* (push, recurse, undo), not the only way to enumerate a search space — when the branching structure is regular enough, like it is here, you can sometimes flatten the recursion into a plain loop.
