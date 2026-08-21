---
layout: post
title: "Dynamic Programming Pattern"
date: 2026-08-22 10:10 +0300
tags: [algorithms, dynamic programming, leetcode]
categories: [algorithms, coding interview patterns]
---

Last one in this run-through, and I'll just say it up front: my `DP` folder in `LeetCodePatterns` is still `public class Class1 { }`. Nothing solved there yet. Every other pattern in this series got written up from code I'd actually pushed; this one's the opposite order — I'm writing up the idea first because it's too important to skip, and the first real solved problem will get dropped into that folder (and probably its own follow-up post) later.

## What the pattern actually is

Dynamic programming is what you reach for when a problem has two properties at once:

- **overlapping subproblems** — solving it recursively means you'd solve the exact same smaller subproblem over and over, and
- **optimal substructure** — the answer to the big problem can be built directly out of answers to those smaller subproblems.

If both hold, plain recursion is wasteful (often exponential) because it keeps redoing work it already did. DP just adds a memory: solve each distinct subproblem once, store the answer, and look it up instead of recomputing it. That's the entire trick. There are two equivalent ways to apply it:

- **top-down (memoization)** — write the recursive solution the "naive" way, then wrap it with a cache (dictionary or array) keyed by the subproblem's parameters. First call computes and stores; every repeat call is a lookup.
- **bottom-up (tabulation)** — figure out the order subproblems depend on each other, and fill a table from the smallest subproblem up to the one you actually want, so every value you need is already sitting in the table by the time you need it.

Same idea, different direction. Top-down reads closer to the recursive definition; bottom-up avoids recursion overhead and is usually what you want once you can see the dependency order clearly.

## The problem

Since I don't have a real solved one in the repo yet, here's the smallest example that still shows the whole pattern honestly: **Climbing Stairs**, LeetCode 70.

You're climbing a staircase with `n` steps. Each move you can go up either 1 step or 2 steps. How many distinct ways are there to reach the top?

For `n = 3` there are 3 ways: `1+1+1`, `1+2`, `2+1`. For `n = 4` there are 5. Small numbers, but the growth is exactly Fibonacci, and that's the point — it's the cleanest possible illustration of "reuse subproblem answers instead of recomputing them."

**Finding the recurrence.** Think about the very last move to reach step `n`. It was either a 1-step move from step `n-1`, or a 2-step move from step `n-2` — those are the only two options, and they're mutually exclusive, so every way to reach `n` is either "a way to reach `n-1`, then +1" or "a way to reach `n-2`, then +2":

```
ways(n) = ways(n-1) + ways(n-2)
```

Base cases: `ways(0) = 1` (there's exactly one way to be already at the top — take zero steps) and `ways(1) = 1` (only one move possible). Everything else follows the recurrence. Notice this is the overlapping-subproblems part in action: computing `ways(5)` naively needs `ways(4)` and `ways(3)`, but `ways(4)` *also* needs `ways(3)` — recompute it recursively without caching and you're re-deriving the same smaller answers exponentially many times.

## Code

A small bottom-up version — my own for this post, not pulled from the repo since there's nothing there yet:

```csharp
public static int ClimbStairs(int n)
{
    if (n <= 1) return 1;

    int prev2 = 1; // ways(0)
    int prev1 = 1; // ways(1)

    for (int i = 2; i <= n; i++)
    {
        int current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }

    return prev1;
}
```

This is the "you don't actually need the whole table" upgrade on top of tabulation: since `ways(i)` only ever depends on the two values right before it, you don't need to keep an array of all `n` values around — just the last two. O(n) time, O(1) space. The visualization below still draws the full table, though, because seeing all the intermediate values side by side is what makes the pattern click.

## Try it

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

Bottom-up table for `n = 8`. At each step, the two cells being summed (`dp[i-1]` and `dp[i-2]`) light up amber, the cell about to be written lights up blue, then turns green once it's finalized. Step through it or hit play.

<div class="algoviz-wrap" id="viz-dp"></div>
<p class="algoviz-caption">Amber = the two previous values being summed. Blue = the cell being written. Green = finalized.</p>

<script>
(function () {
  var N = 8;
  var BLUE = '#4C8BF5';
  var GREEN = '#2FA84F';
  var AMBER = '#E8871E';

  // Precompute steps by literally running the bottom-up loop once.
  var dp = new Array(N + 1).fill(null);
  dp[0] = 1;
  dp[1] = 1;

  var steps = [];

  function snapshot(current, deps) {
    steps.push({
      values: dp.slice(),
      current: current,
      deps: deps ? deps.slice() : []
    });
  }

  // base cases, shown one at a time
  snapshot(0, []);
  snapshot(1, []);

  for (var i = 2; i <= N; i++) {
    // about to compute dp[i] from dp[i-1] and dp[i-2]
    snapshot(i, [i - 1, i - 2]);
    dp[i] = dp[i - 1] + dp[i - 2];
    snapshot(i, [i - 1, i - 2]);
  }

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 580;
      canvas.height = 200;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var pad = 14;
    var cellW = 54;
    var cellH = 54;
    var gap = 6;
    var top = 56;

    ctx.fillStyle = fg;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    var written = step.values[step.current] !== null;
    var status = !written
      ? 'computing dp[' + step.current + '] = dp[' + step.deps[0] + '] + dp[' + step.deps[1] + ']'
      : (step.deps.length
          ? 'dp[' + step.current + '] = ' + step.values[step.current] + ' — written'
          : 'base case: dp[' + step.current + '] = ' + step.values[step.current]);
    ctx.fillText(status, pad, 24);

    for (var i = 0; i <= N; i++) {
      var x = pad + i * (cellW + gap);
      var isCurrent = i === step.current;
      var isDep = step.deps.indexOf(i) !== -1;
      var isDone = step.values[i] !== null && !isCurrent;

      var color = fg;
      if (isCurrent) color = BLUE;
      else if (isDep) color = AMBER;
      else if (isDone) color = GREEN;

      ctx.globalAlpha = (isCurrent || isDep) ? 0.18 : (isDone ? 0.12 : 0);
      if (ctx.globalAlpha > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x, top, cellW, cellH);
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = (isCurrent || isDep) ? 2 : 1;
      ctx.strokeRect(x, top, cellW, cellH);
      ctx.lineWidth = 1;

      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.7;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('dp[' + i + ']', x + cellW / 2, top - 6);
      ctx.globalAlpha = 1;

      ctx.fillStyle = color === fg ? fg : color;
      ctx.font = 'bold 16px sans-serif';
      var val = step.values[i];
      ctx.fillText(val === null ? '?' : String(val), x + cellW / 2, top + cellH / 2 + 6);
    }
  }

  AlgoViz.mount(document.getElementById('viz-dp'), { steps: steps, render: render, initialSpeed: 700 });
})();
</script>

## How to spot this pattern

The phrasing is usually the giveaway: "count the number of ways to...", "find the min/max cost to...", "can you reach/make X", combined with a small set of choices at each step whose consequences overlap (like the 1-step-or-2-step choice above, or coin denominations, or take-or-skip). If recursion on the problem would naturally call itself with the same arguments more than once, it's DP-shaped — memoize it top-down, or find the fill order and tabulate it bottom-up.

Once I actually solve a real DP problem in the repo, it'll land in that empty folder and get its own follow-up post here.
