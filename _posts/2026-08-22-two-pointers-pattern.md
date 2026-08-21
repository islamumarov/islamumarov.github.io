---
layout: post
title: "Two Pointers Pattern"
date: 2026-08-22 09:07 +0300
tags: [algorithms, two pointers, leetcode]
categories: [algorithms, coding interview patterns]
---

I've been going back through LeetCode patterns one at a time, mostly to rebuild the muscle memory that fades a bit every time I go a few months without touching a whiteboard. This time it's Two Pointers.

## What the pattern is

Two Pointers is exactly what it sounds like: you keep two indices into a data structure (usually an array, sometimes a string or a linked list) and move them according to some rule instead of nesting loops. It's the pattern I reach for when:

- the input is sorted, or has some ordering property I can exploit,
- I need to compare or combine elements from two positions instead of scanning one at a time,
- a brute-force solution would check every pair (`O(n^2)`) but the structure of the problem lets me rule out a whole chunk of pairs at once.

The two pointers can start at both ends and move toward each other (the "meet in the middle" shape), or both start at the beginning and move at different speeds (fast/slow, useful for cycle detection or removing duplicates). Today's problem is the first kind.

## The problem

LeetCode 11, "Container With Most Water." You're given an array of non-negative integers where each value is the height of a vertical line drawn at that index. Pick two lines; together with the x-axis they form a container. You want the pair of lines that holds the most water, where the amount of water is `min(height[i], height[j]) * (j - i)` — width times the shorter of the two walls, because water spills over the shorter side.

The obvious brute force is to check every pair of lines, `O(n^2)`. Two pointers gets it down to a single pass.

## The code

Here's the actual solution from my `TwoPointers` repo, `MostWater.cs`:

```csharp
public static int MaxArea(int[] height)
{
    var left = 0;
    var right = height.Length - 1;
    var maxArea = 0;
    while (left < right)
    {
        var minHeight = Math.Min(height[left], height[right]);
        maxArea = Math.Max(maxArea, minHeight * (right - left));

        if (height[left] < height[right])
        {
            left++;
        }
        else
        {
            right--;
        }
    }
    return maxArea;
}
```

Start with the widest possible container: `left` at index 0, `right` at the last index. Compute its area, keep it if it beats the best seen so far, then shrink the container by moving one of the pointers inward.

The part that took me a second to convince myself of the first time I saw this pattern: which pointer do you move? The answer is always the one pointing at the **shorter** line. Here's why that's safe, not just a heuristic:

- The width only shrinks as `left` and `right` move toward each other — that's guaranteed, every step.
- The area is capped by `min(height[left], height[right])`. If I move the *taller* pointer inward, the shorter wall is still the bottleneck (or a new, possibly shorter, wall takes over) — so the height cap can only stay the same or get worse, while the width has already dropped. That combination can never produce a better area than what I already had.
- If I move the *shorter* pointer instead, the width still drops, but there's now a chance the new line is taller than the old shorter one, which raises the height cap. That's the only way I can possibly find something better than the current best. So moving the shorter pointer is the only move that doesn't waste the step.

That one observation is what collapses `O(n^2)` pairs down to a single `O(n)` sweep — every step either improves the answer or provably can't be beaten by anything the discarded pointer position could have offered. Space is `O(1)`, just the two indices and a running max.

## Try it

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

Below is the algorithm running on the sample array `[1, 8, 6, 2, 5, 4, 8, 3, 7]`. Step through it or hit play — watch how the pointers only ever close in from the shorter side, and how the max-area label only updates when a step actually beats the previous best.

<div class="algoviz-wrap" id="viz-two-pointers"></div>
<p class="algoviz-caption">Blue = left/right pointers. Amber outline = current container. Green label = best area so far.</p>

<script>
(function () {
  var heights = [1, 8, 6, 2, 5, 4, 8, 3, 7];

  // Precompute every step by literally running the algorithm.
  var steps = [];
  (function run() {
    var left = 0, right = heights.length - 1, maxArea = 0;
    while (left < right) {
      var minHeight = Math.min(heights[left], heights[right]);
      var area = minHeight * (right - left);
      var improved = area > maxArea;
      maxArea = Math.max(maxArea, area);
      steps.push({ left: left, right: right, area: area, maxArea: maxArea, improved: improved });
      if (heights[left] < heights[right]) {
        left++;
      } else {
        right--;
      }
    }
    // Final step showing the pointers meeting / loop end.
    steps.push({ left: left, right: right, area: 0, maxArea: maxArea, improved: false, done: true });
  })();

  var BLUE = '#4C8BF5';
  var AMBER = '#E8871E';
  var GREEN = '#2FA84F';

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 260;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var padding = 30;
    var plotW = canvas.width - padding * 2;
    var plotH = canvas.height - padding * 2 - 30; // leave room for label at top
    var n = heights.length;
    var barW = plotW / n;
    var maxHeight = Math.max.apply(null, heights);
    var baseY = padding + plotH + 30;

    function barX(i) { return padding + i * barW; }
    function barTopY(h) { return baseY - (h / maxHeight) * plotH; }

    // baseline (x-axis)
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding, baseY);
    ctx.lineTo(padding + plotW, baseY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // container fill between left/right (drawn first, under the bars)
    if (!step.done) {
      var containerH = Math.min(heights[step.left], heights[step.right]);
      var x1 = barX(step.left) + barW * 0.5;
      var x2 = barX(step.right) + barW * 0.5;
      var yTop = barTopY(containerH);
      ctx.fillStyle = AMBER;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x1, yTop, x2 - x1, baseY - yTop);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, yTop, x2 - x1, baseY - yTop);
      ctx.lineWidth = 1;
    }

    // bars
    for (var i = 0; i < n; i++) {
      var h = heights[i];
      var x = barX(i);
      var top = barTopY(h);
      var isPointer = (i === step.left || i === step.right);
      ctx.fillStyle = isPointer ? BLUE : fg;
      ctx.globalAlpha = isPointer ? 1 : 0.35;
      ctx.fillRect(x + barW * 0.15, top, barW * 0.7, baseY - top);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(x + barW * 0.15, top, barW * 0.7, baseY - top);
      ctx.globalAlpha = 1;

      // height value label
      ctx.fillStyle = fg;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(h), x + barW * 0.5, baseY + 14);
    }

    // pointer labels
    ctx.fillStyle = BLUE;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    if (step.left <= step.right) {
      ctx.fillText('L', barX(step.left) + barW * 0.5, baseY + 28);
    }
    if (step.right !== step.left) {
      ctx.fillText('R', barX(step.right) + barW * 0.5, baseY + 28);
    } else if (step.left === step.right) {
      ctx.fillText('L/R', barX(step.left) + barW * 0.5, baseY + 28);
    }

    // top status line
    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = fg;
    var statusText = step.done
      ? 'pointers met — done'
      : 'area = min(' + heights[step.left] + ', ' + heights[step.right] + ') × ' + (step.right - step.left) + ' = ' + step.area;
    ctx.fillText(statusText, padding, 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = step.improved ? GREEN : fg;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('max area: ' + step.maxArea, canvas.width - padding, 16);
  }

  AlgoViz.mount(document.getElementById('viz-two-pointers'), { steps: steps, render: render, initialSpeed: 600 });
})();
</script>

## Takeaways

- Two Pointers turns an `O(n^2)` all-pairs check into an `O(n)` sweep whenever you can prove that discarding one side of a comparison never loses the optimal answer.
- The proof here is short but it's the whole trick: width always shrinks, so the only lever left is height, and only moving the shorter pointer can possibly raise it.
- `O(n)` time, `O(1)` space — for a problem whose brute force is quadratic, that's a good sign this pattern was worth reaching for.
