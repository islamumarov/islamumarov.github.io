---
layout: post
title: "Binary Search Pattern"
date: 2026-08-22 09:14 +0300
tags: [algorithms, binary search, leetcode]
categories: [algorithms, coding interview patterns]
---

I've been going through LeetCode patterns one at a time in a little C# repo, and Binary Search was the one I thought I already knew. Turns out "knew" meant "can find a number in a sorted array." The actual pattern is bigger than that, and the problem that made it click for me — [LeetCode 540, Single Element in a Sorted Array](https://leetcode.com/problems/single-element-in-a-sorted-array/) — doesn't even look like a search problem at first glance.

## Binary search is really "search on a predicate"

The textbook version of binary search finds a target value in a sorted array. The pattern version is more general: you have a monotonic condition — something that's `false` for a while and then `true` for the rest of the array (or vice versa) — and you're looking for the boundary where it flips. The array being "sorted by value" is just the most common special case of that condition being monotonic. Once you see it this way, a lot of problems that don't mention "sorted" at all (search in rotated array, minimum capacity to ship packages, first bad version) turn out to be the same `left`/`right`/`mid` loop with a different predicate.

LeetCode 540 is a nice example because the predicate isn't "is `nums[mid]` bigger or smaller than the target" — there's no target. The predicate is about index parity.

## The problem

You get a sorted array where every element shows up exactly twice, except one element that shows up once. Find that one element, in O(log n) time.

```
[1,1,2,2,3,3,4,5,5,6,6]
             ^
          single = 4, at index 6
```

Linear scan is trivial (walk the array, compare pairs) but that's O(n), and the problem explicitly wants log n — which is your cue that something about the structure is binary-searchable, even though we're not looking for a "target value."

## The trick: index parity

Here's the real source from my repo (trimmed to just the method):

```csharp
public class Solution
{
    public int SingleNonDuplicate(int[] nums)
    {
        var left = 0;
        var right = nums.Length - 1;

        while (left < right)
        {
            var mid = left + (right - left) / 2;
            if (mid % 2 == 1)
                mid--;

            if (nums[mid] != nums[mid + 1])
                right = mid;
            else
                left = mid + 2;
        }

        return nums[left];
    }
}
```

The insight: before the single element, every pair lines up as `(even, odd)` — index 0 and 1 are a pair, 2 and 3 are a pair, and so on. The single element breaks that alignment. Everything from its index onward gets shifted by one, so pairs after it look like `(odd, even)` instead.

That means the parity of the index *at the start of a pair* is a monotonic predicate over the array: "even-indexed pairs" on the left of the single element, "odd-indexed pairs" on the right. Binary search doesn't care what the predicate means, only that it flips once — so we can binary search on it.

The only wrinkle is that binary search's `mid` can land on either half of a pair, and we specifically need to be looking at the *first* index of a pair to check alignment correctly. That's what this does:

```csharp
if (mid % 2 == 1)
    mid--;
```

If `mid` is odd, step it back one so it's always the even, left-hand member of whatever pair it's sitting in. Now `nums[mid] == nums[mid + 1]` is a clean question: "is this still a normal, unbroken pair?"

- If `nums[mid] == nums[mid + 1]`, the pair is intact, which means the single element hasn't disrupted anything yet at this point — it must be further right. Discard the left half: `left = mid + 2` (skip past the whole pair, not just `mid + 1`, since we know the next index is still part of this pair).
- If `nums[mid] != nums[mid + 1]`, the pair is broken, meaning the single element is at or before `mid`. Discard the right half: `right = mid` (keep `mid`, since it might *be* the answer).

The loop ends when `left == right`, and that index holds the single element.

Complexity: O(log n) time — half the search space is discarded every iteration, same as any binary search — and O(1) space, just two or three index variables.

## Try it

Here's the algorithm running step by step on `[1,1,2,2,3,3,4,5,5,6,6]`. Watch how `mid` always snaps to an even index, and how the eliminated region grows on either the left or the right depending on whether the pair at `mid` is intact.

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

<div class="algoviz-wrap" id="viz-binary-search"></div>
<p class="algoviz-caption">Blue = current mid (forced even). Dimmed cells = eliminated range. Green = the single element.</p>

<script>
(function () {
  var nums = [1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

  // Run the real algorithm once, snapshotting {left, right, mid} at each iteration.
  var steps = [];
  var left = 0;
  var right = nums.length - 1;

  while (left < right) {
    var mid = left + Math.floor((right - left) / 2);
    if (mid % 2 === 1) mid--;

    steps.push({ left: left, right: right, mid: mid, found: false });

    if (nums[mid] !== nums[mid + 1]) {
      right = mid;
    } else {
      left = mid + 2;
    }
  }

  steps.push({ left: left, right: right, mid: left, found: true });

  var CELL = 46;
  var GAP = 4;
  var TOP = 30;

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = nums.length * (CELL + GAP) + GAP;
      canvas.height = 130;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < nums.length; i++) {
      var x = GAP + i * (CELL + GAP);
      var eliminated = i < step.left || i > step.right;

      var fillColor = 'transparent';
      var strokeColor = fg;
      var strokeAlpha = eliminated ? 0.25 : 1;
      var textAlpha = eliminated ? 0.35 : 1;

      if (step.found && i === step.left) {
        fillColor = '#2FA84F';
        strokeColor = '#2FA84F';
        textAlpha = 1;
      } else if (!step.found && i === step.mid) {
        fillColor = '#4C8BF5';
        strokeColor = '#4C8BF5';
        textAlpha = 1;
      }

      ctx.globalAlpha = 1;
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, TOP, CELL, CELL);
      }

      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, TOP, CELL, CELL);

      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = (fillColor !== 'transparent') ? '#fff' : fg;
      ctx.fillText(String(nums[i]), x + CELL / 2, TOP + CELL / 2);

      ctx.globalAlpha = eliminated ? 0.35 : 1;
      ctx.fillStyle = fg;
      ctx.font = '10px sans-serif';
      ctx.fillText(String(i), x + CELL / 2, TOP + CELL + 14);
      ctx.font = '13px sans-serif';
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.fillStyle = fg;
    ctx.font = '12px sans-serif';
    var label = step.found
      ? 'found: index ' + step.left + ' (value ' + nums[step.left] + ')'
      : 'left=' + step.left + '  right=' + step.right + '  mid=' + step.mid +
        (nums[step.mid] === nums[step.mid + 1] ? '  (pair intact → go right)' : '  (pair broken → go left)');
    ctx.fillText(label, GAP, 16);
  }

  AlgoViz.mount(document.getElementById('viz-binary-search'), { steps: steps, render: render, initialSpeed: 900 });
})();
</script>

## Takeaways

- Binary search generalizes to "find the boundary of a monotonic predicate," not just "find a value."
- For 540, the predicate is index parity — even-start pairs vs. odd-start pairs — and it flips exactly once, right at the single element.
- Forcing `mid` to be even before comparing is the whole trick; skip that and the pair check is meaningless.
- O(log n) time, O(1) space — same cost profile as any binary search, just a less obvious condition to search on.
