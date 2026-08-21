---
layout: post
title: "Sorting Pattern"
date: 2026-08-22 09:21 +0300
tags: [algorithms, sorting, insertion sort]
categories: [algorithms, coding interview patterns]
---

## Why sorting is a pattern, not just an algorithm

I keep a small C# repo ([LeetCodePatterns](https://github.com/islamumarov)) where I re-implement the classic patterns from scratch instead of just solving one-off problems. The `Sortings` folder is the newest and smallest one so far — right now it only has insertion sort in it. But it earns its own post because "sort the input first" is a pattern in the same sense that sliding window or two pointers are.

Most of the time the interesting part of a problem isn't the sort itself — it's what sorting unlocks. Two pointers converging from both ends only works cleanly on sorted data. Greedy interval-scheduling problems become trivial once you sort by start (or end) time. A lot of "find the pair/triplet that..." problems turn from O(n²) or worse into O(n log n) the moment you sort and walk. So before reaching for a clever technique, it's worth asking: does sorting make the real problem go away? Insertion sort is the simplest version of "sort it" to have in your hand, and it's a good one to actually understand instead of just calling `Array.Sort`.

## Walking through the code

Here's the real method from `Sortings/Sortings/Class1.cs`, trimmed of the namespace wrapper:

```csharp
public static void Insertions(int[] arr)
{
    for (int i = 1; i < arr.Length; i++)
    {
        var j = i;
        while (j > 0 && arr[j] < arr[j - 1])
        {
            (arr[j - 1], arr[j]) = (arr[j], arr[j - 1]);
            j--;
        }
    }
}
```

The idea: treat `arr[0..i)` as already sorted (trivially true when `i == 1`, since a single element is sorted by definition), then take `arr[i]` and walk it backward, swapping with its left neighbor, until it lands somewhere that isn't smaller than what's to its left. That's the whole algorithm — it's "insert a card into an already-sorted hand" done with adjacent swaps.

A couple of things worth noticing in this specific implementation:

- It uses adjacent swaps (`while` + swap + `j--`) rather than shifting elements and dropping the picked-up value in once at the end. Same asymptotic cost, slightly more swap operations, but it reads very close to the mental model.
- The `j > 0 &&` check comes first, so `arr[j - 1]` is never evaluated out of bounds — short-circuit evaluation doing its job.
- It sorts in place. No extra array is allocated.

**Complexity:** worst case O(n²) (reverse-sorted input — every new element has to walk all the way to index 0), best case O(n) (already-sorted input — the `while` condition fails immediately every time), O(1) extra space, and it's stable (equal elements never swap past each other, since the loop only swaps on strict `<`).

## When I'd actually reach for insertion sort

Not often, honestly — most languages give you a solid sort in the standard library and there's rarely a reason to hand-roll one in an interview unless it's explicitly what's being asked. But it's the right tool when:

- **n is small.** The constant factor is tiny and the O(n²) worst case never gets a chance to matter.
- **The data is nearly sorted already.** That's the case where insertion sort is close to O(n), which beats a general-purpose O(n log n) sort in practice.
- **You're inserting one element at a time into an already-sorted structure** (online/streaming input) rather than sorting a static batch. This is basically what LeetCode 147 "Insertion Sort List" is testing, and it's the same shape as maintaining a sorted window or a sorted running result as new data arrives.

For anything larger or without that "almost sorted" property, I'd use the language's built-in sort (which is usually a well-tuned hybrid, like Timsort or introsort) and spend my energy on the actual problem logic instead.

## Try it

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

Below is the exact algorithm above, traced step by step over `[5, 2, 4, 6, 1, 3]`. Green is the sorted prefix, blue is the element currently being picked up and walked backward, amber is the neighbor it's being compared against (and about to swap with).

<div class="algoviz-wrap" id="viz-sorting"></div>
<p class="algoviz-caption">Green = sorted prefix. Blue = element being inserted. Amber = shifting to make room.</p>

<script>
(function () {
  function computeSteps(input) {
    var arr = input.slice();
    var steps = [];
    function snap(sortedEnd, inserting, shifting) {
      steps.push({ arr: arr.slice(), sortedEnd: sortedEnd, inserting: inserting, shifting: shifting });
    }
    snap(1, null, null);
    for (var i = 1; i < arr.length; i++) {
      var j = i;
      snap(i, j, null);
      while (j > 0 && arr[j] < arr[j - 1]) {
        snap(i, j, j - 1);
        var tmp = arr[j - 1];
        arr[j - 1] = arr[j];
        arr[j] = tmp;
        j--;
        snap(i, j, null);
      }
    }
    snap(arr.length, null, null);
    return steps;
  }

  var steps = computeSteps([5, 2, 4, 6, 1, 3]);

  var fg = getComputedStyle(document.body).color;
  var BLUE = '#4C8BF5';
  var AMBER = '#E8871E';
  var GREEN = '#2FA84F';

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 420;
      canvas.height = 240;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var arr = step.arr;
    var n = arr.length;
    var maxVal = Math.max.apply(null, arr);
    var padding = 20;
    var gap = 10;
    var barW = (canvas.width - padding * 2 - gap * (n - 1)) / n;
    var baseline = canvas.height - 30;
    var maxBarH = baseline - 20;

    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';

    for (var k = 0; k < n; k++) {
      var x = padding + k * (barW + gap);
      var h = (arr[k] / maxVal) * maxBarH;
      var y = baseline - h;

      var color = fg;
      if (k === step.inserting) color = BLUE;
      else if (k === step.shifting) color = AMBER;
      else if (k < step.sortedEnd) color = GREEN;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, h);
      ctx.strokeStyle = fg;
      ctx.strokeRect(x, y, barW, h);

      ctx.fillStyle = fg;
      ctx.fillText(String(arr[k]), x + barW / 2, baseline + 18);
    }
  }

  AlgoViz.mount(document.getElementById('viz-sorting'), { steps: steps, render: render, initialSpeed: 500 });
})();
</script>

## Wrapping up

There's not much more to insertion sort than "walk it back until it fits," but it's a good algorithm to actually be able to write from memory, since it's the base case for a lot of "sort, then do the real work" problems. The `Sortings` folder in my practice repo is going to grow as I add merge sort, quicksort, and the sorting-adjacent patterns (like the Dutch national flag / three-way partition problem) — this post is just the first entry.
