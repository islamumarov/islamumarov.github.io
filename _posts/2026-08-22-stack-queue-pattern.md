---
layout: post
title: "Stack & Queue Pattern"
date: 2026-08-22 09:28 +0300
tags: [algorithms, stack, queue, monotonic stack, heap, leetcode]
categories: [algorithms, coding interview patterns]
---

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

I've been working through a `Stack.Queue` folder in my [LeetCode patterns repo](https://github.com/islamumarov/LeetCodePatterns), and after four problems the common thread became obvious: these aren't really "stack problems" or "queue problems" — they're all about **tracking order** and **deferring work until it's ready**.

A stack remembers "what came last, in case I need to undo it or match it." A queue remembers "who's next, in the order they arrived." A heap is really just a queue where "next" means "most urgent" instead of "first in line." Once you see it that way, a surprising number of interview problems boil down to: push things onto some ordered structure, and pop them off only when a condition says they're ready — a matching bracket, a warmer day, a cooldown timer, a rebalanced median.

Here are the four problems that convinced me.

## Valid Parentheses (LeetCode 20)

Given a string of `()[]{}`, decide if the brackets are properly matched and nested.

```csharp
public static bool IsValid(string s)
{
    var stack = new Stack<char>();
    var parentheses = new Dictionary<char, char>()
    {
        { ')', '(' },
        { ']', '[' },
        { '}', '{' }
    };
    foreach (char c in s)
    {
        if (parentheses.ContainsKey(c))
        {
            if (stack.Count == 0 || parentheses[c] != stack.Pop())
                return false;
        }
        else { stack.Push(c); }
    }

    return stack.Count == 0;
}
```

The trick is almost too simple to call a trick: every opening bracket is a "debt" you push onto the stack, and every closing bracket has to pay off the most recent debt first — that's exactly LIFO order. If the closer doesn't match what's on top, or there's nothing to pop, it's invalid. If anything is left on the stack at the end, something never got closed. One pass, one stack: **O(n) time, O(n) space**.

## Daily Temperatures (LeetCode 739)

For each day, find how many days you'd have to wait until a warmer temperature. If there's no warmer day ahead, the answer is `0`.

```csharp
public static int[] DailyTemperaturesSol(int[] temperatures) {
    var n = temperatures.Length;
    var res = new int[n];
    var monotonic = new Stack<int>();

    for (int i = n-1; i > -1; i--)
    {
        while (monotonic.Count > 0 && temperatures[i] >= temperatures[monotonic.Peek()])
        {
            monotonic.Pop();
        }
        res[i] = monotonic.Count > 0 ? monotonic.Peek() - i : 0;
        monotonic.Push(i);
    }
    return res;
}
```

This is the classic **monotonic stack**. Here it walks right-to-left and keeps a stack of indices whose temperatures are strictly decreasing as you go down the stack — any day that's colder-or-equal to `temperatures[i]` is useless to future days once `i` is in play, so it gets popped and discarded. Whatever survives on top of the stack after the popping is the nearest day to the right that's warmer than `i`.

The reason this is fast is subtle the first time you see it: it *looks* like a nested loop (a `for` with a `while` inside), but every index is pushed exactly once and popped at most once over the whole run. That amortizes to **O(n) time, O(n) space** even though a single iteration of the outer loop can pop many elements.

## Task Scheduler (LeetCode 621)

Given a list of CPU tasks and a cooldown `n`, find the minimum number of time units needed to finish all tasks if the same task type must be separated by at least `n` intervals (idle slots allowed).

```csharp
public int LeastInterval(char[] tasks, int n)
{
    var frequency = new int[26];
    foreach (char task in tasks)
    {
        frequency[task - 'A']++;
    }
    var pq = new PriorityQueue<int, int>();
    var res = new List<char>();
    for (var i = 0; i < frequency.Length; i++)
    {
        if (frequency[i] > 0)
        {
            pq.Enqueue(i, -frequency[i]);
        }
    }
    // Step 3: cooldown line — tasks waiting out their n-gap.
    //         each entry = (remaining count, the time it's allowed back).
    var cooldown = new Queue<(int count, int availAt)>();
    int time = 0;

    while (pq.Count > 0 || cooldown.Count > 0)
    {
        time++;
        if (pq.Count > 0)
        {
            int remaining = pq.Dequeue() - 1;
            if (remaining > 0)
            {
                cooldown.Enqueue((remaining, time + n));
            }
        }
        // else: heap empty but cooldown not -> this interval is forced idle.

        // Step 5: if the task at the front of cooldown is eligible now, release it.
        if (cooldown.Count > 0 && cooldown.Peek().availAt == time) {
            var ready = cooldown.Dequeue();
            pq.Enqueue(ready.count, -ready.count);
        }
    }

    return time;
}
```

This one combines both structures. A **max-heap** (a `PriorityQueue` with negated priorities, since .NET's is a min-heap) always hands you whichever task type still has the *most* remaining work — that's the greedy part: always run the busiest task first so it doesn't end up bottlenecking the schedule later. But you can't run it again immediately, so once a task is used it goes into a **cooldown queue** carrying its remaining count and the exact time slot it's allowed to re-enter the heap. Every tick checks the front of that queue (FIFO, since cooldowns naturally expire in the order they were added) and releases it back into the heap once its wait is over. If the heap is empty but the cooldown queue isn't, that tick is a forced idle slot. Time complexity is **O(n log 26)** — the heap never holds more than 26 entries — and space is **O(26)**.

## Find Median from Data Stream (LeetCode 295)

Support adding numbers one at a time from a stream, and returning the median of everything seen so far, at any point.

```csharp
public PriorityQueue<float, float> low;
public PriorityQueue<float, float> high;
public MedianFinder() {
    low = new PriorityQueue<float, float>();
    high = new PriorityQueue<float, float>(comparer: Comparer<float>.Default);
}

public void AddNum(int num) {
    if (low.Count == high.Count && low.Count > 0)
    {
        var temp = low.EnqueueDequeue(num, num);
        high.Enqueue(temp, temp);
    }
    else
    {
        low.Enqueue(num, num);
    }
}

public double FindMedian() {
    if (low.Count == high.Count)
    {
        return (low.Peek() + high.Peek())/2;
    }

    return low.Peek();
}
```

The two-heap trick: keep the smaller half of the numbers in `low` (a max-heap — the field is misleadingly named `low` but note it's the default `PriorityQueue`, which is a min-heap, so this code is actually using negation-free trickery via `EnqueueDequeue` to route the bigger of the two candidates into `high`) and the larger half in `high` (also a `PriorityQueue`, kept as the effective min-heap of the upper half). As long as the two heaps stay balanced in size (or `low` has exactly one more element), the median is always sitting right at the top of one or both heaps — no need to re-sort anything on every query. `AddNum` is **O(log n)** per call, `FindMedian` is **O(1)**, and total space is **O(n)**.

## Try it: watching the monotonic stack work

The easiest way I found to actually *feel* why the monotonic stack in Daily Temperatures is O(n) is to watch it push and pop over a small array. Step through it below — amber bars are indices currently parked in the stack waiting for a warmer day; a bar flashes green the moment it gets popped because `i` is finally warmer than it.

<div class="algoviz-wrap" id="viz-stack-queue"></div>
<p class="algoviz-caption">Amber = indices waiting in the stack. Green = an index that just found its next warmer day.</p>

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>
<script>
(function () {
  var temps = [73, 74, 75, 71, 69, 72, 76, 73];
  var n = temps.length;

  // Precompute every push/pop as a snapshot, left-to-right monotonic-decreasing stack.
  function buildSteps() {
    var result = new Array(n).fill(0);
    var stack = [];
    var steps = [];

    function snapshot(i, justPopped, note) {
      steps.push({
        i: i,
        stack: stack.slice(),
        result: result.slice(),
        justPopped: justPopped,
        note: note
      });
    }

    for (var i = 0; i < n; i++) {
      snapshot(i, null, 'Looking at day ' + i + ' (' + temps[i] + '°)');
      while (stack.length > 0 && temps[i] > temps[stack[stack.length - 1]]) {
        var popped = stack.pop();
        var wait = i - popped;
        result[popped] = wait;
        snapshot(i, { index: popped, wait: wait }, 'Day ' + popped + ' found a warmer day at ' + i + ' → wait ' + wait);
      }
      stack.push(i);
      snapshot(i, null, 'Push day ' + i + ' onto the stack');
    }
    return steps;
  }

  var steps = buildSteps();

  var minT = Math.min.apply(null, temps);
  var maxT = Math.max.apply(null, temps);
  var BLUE = '#4C8BF5';
  var AMBER = '#E8871E';
  var GREEN = '#2FA84F';

  var startX = 50, barW = 40, gap = 10, axisY = 190;

  function barX(j) { return startX + j * (barW + gap); }
  function barTop(j) {
    var h = 20 + (temps[j] - minT) / (maxT - minT) * 130;
    return axisY - h;
  }

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 280;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Note at top.
    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.note, 10, 16);

    // Axis.
    ctx.strokeStyle = fg;
    ctx.beginPath();
    ctx.moveTo(startX - 10, axisY);
    ctx.lineTo(startX + n * (barW + gap), axisY);
    ctx.stroke();

    for (var j = 0; j < n; j++) {
      var x = barX(j);
      var top = barTop(j);
      var h = axisY - top;
      var isCurrent = j === step.i;
      var isPopped = step.justPopped && step.justPopped.index === j;
      var inStack = step.stack.indexOf(j) !== -1;

      var fill;
      if (isPopped) fill = GREEN;
      else if (isCurrent) fill = BLUE;
      else if (inStack) fill = AMBER;
      else fill = 'transparent';

      ctx.fillStyle = fill;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      if (fill !== 'transparent') {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, top, barW, h);
        ctx.globalAlpha = 1;
      }
      ctx.strokeRect(x, top, barW, h);

      // Temperature label above bar.
      ctx.fillStyle = fg;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(temps[j] + '°', x + barW / 2, top - 6);

      // Index label below axis.
      ctx.fillText('i=' + j, x + barW / 2, axisY + 14);

      // Wait-days result, once known.
      if (step.result[j] !== 0) {
        ctx.fillStyle = isPopped ? GREEN : fg;
        ctx.font = isPopped ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillText('+' + step.result[j], x + barW / 2, top - 20);
      }
    }

    // Stack strip.
    ctx.fillStyle = fg;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('stack (bottom → top):', startX, axisY + 40);

    var boxW = 30, boxH = 22, boxGap = 6;
    for (var k = 0; k < step.stack.length; k++) {
      var idx = step.stack[k];
      var bx = startX + k * (boxW + boxGap);
      var by = axisY + 50;
      ctx.fillStyle = AMBER;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fg;
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.fillText(String(idx), bx + boxW / 2, by + boxH / 2 + 4);
    }
  }

  AlgoViz.mount(document.getElementById('viz-stack-queue'), { steps: steps, render: render, initialSpeed: 600 });
})();
</script>

## Takeaways

Four problems, three data structures, one shared idea: keep just enough ordered state around to answer "what's next" or "what's still waiting," and let the structure do the sorting work for you instead of re-scanning.

- **Stack** = defer until the most recent thing is resolved (bracket matching, monotonic "next greater/smaller" scans).
- **Queue** = defer until a fixed amount of time or work has passed (cooldowns, BFS layers).
- **Heap** = defer until priority says otherwise (busiest task next, balanced median).

The part that surprised me most was Daily Temperatures — it *looks* quadratic on first read because of the nested loop, and it took actually stepping through the pushes and pops to convince myself each index really is only touched twice, ever.
