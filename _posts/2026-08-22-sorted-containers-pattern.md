---
layout: post
title: "Sorted Containers Pattern"
date: 2026-08-22 10:03 +0300
tags: [algorithms, sorted containers, binary search, design, leetcode]
categories: [algorithms, coding interview patterns]
---

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">

## The pattern

A lot of "design a data structure" problems boil down to the same requirement: you need to insert data quickly, but you also need to query it by order — the nearest key to some value, or everything in a range. A plain `Dictionary`/hashmap gives you O(1) lookup by exact key, but it has no idea what "nearest" or "between" means. A plain list gives you order, but inserting into the middle is O(n).

The fix is a container that keeps its keys sorted as you insert — `SortedDictionary` or `SortedList` in C#, `TreeMap` in Java, the third-party `sortedcontainers` package in Python. Once the keys are sorted, range and nearest-neighbor questions turn into binary search, which is where the real complexity payoff comes from.

I ran into this pattern twice in a row while working through my [LeetCodePatterns](https://github.com/islamumarov/LeetCodePatterns) repo, so it earned its own post. Two problems, two different tools from the same drawer.

## Design Log Storage System (LC 635)

The problem: logs come in as `(id, timestamp)` pairs, where the timestamp is a fixed-width, zero-padded string like `"2017:01:01:23:59:59"`. You need to store them, then retrieve every id whose timestamp falls in `[start, end]` — but "falls in range" is defined at a given granularity. If granularity is `"Day"`, then `"2017:01:01:23:59:59"` and `"2017:01:01:00:00:01"` are the same bucket, because everything past the day field gets ignored for the comparison.

Here's the actual implementation:

```csharp
public class LogStorageSystem
{
    private SortedDictionary<int, string> logs = new SortedDictionary<int, string>();

    public void Put(int id, string timestamp)
    {
        logs[id] = timestamp;
    }

    public IList<int> Retrieve(string start, string end, string granularity)
    {
        string NormalizeTimestamp(string timestamp, bool isEnd)
        {
            return granularity switch
            {
                "Year"
                    => timestamp.Substring(0, 4) + (isEnd ? ":12:31:23:59:59" : ":01:01:00:00:00"),
                "Month" => timestamp.Substring(0, 7) + (isEnd ? ":31:23:59:59" : ":01:00:00:00"),
                "Day" => timestamp.Substring(0, 10) + (isEnd ? ":23:59:59" : ":00:00:00"),
                "Hour" => timestamp.Substring(0, 13) + (isEnd ? ":00:00" : ":00:00"),
                "Minute" => timestamp.Substring(0, 16) + (isEnd ? ":00" : ":00"),
                "Second" => timestamp,
                _ => throw new ArgumentException("Invalid granularity"),
            };
        }

        string startKey = NormalizeTimestamp(start, false);
        string endKey = NormalizeTimestamp(end, true);

        List<int> result = new List<int>();

        foreach (var log in logs)
        {
            if (string.Compare(log.Value, startKey) >= 0 && string.Compare(log.Value, endKey) <= 0)
            {
                result.Add(log.Key);
            }
        }

        return result;
    }
}
```

The trick that makes this work is normalization, not the sorted container itself. Since the timestamp format is fixed-width and every field is zero-padded, lexicographic string comparison and chronological comparison agree completely — `"2017:02:01..." > "2017:01:31..."` as strings, exactly like it is in time. That means once you round `start` down to the *floor* of its granularity bucket and round `end` up to the *ceiling* of its bucket, a plain `string.Compare` does all the range-membership work for you. `"Day"` granularity turns `start` into midnight of that day and `end` into 23:59:59 of that day — anything with the same date prefix now compares as being inside the window.

Where the `SortedDictionary` actually earns its keep here is `Put` — O(log n) insert keeping ids ordered — but honestly `Retrieve` doesn't take advantage of the sort at all. It does a full O(n) linear scan over every stored log and string-compares each one against the normalized bounds. A sharper version would binary-search into the sorted structure for the start boundary and walk forward only through the matching range, dropping retrieve down to O(log n + k) where k is the result size. That's not a bug — the code is correct — just an optimization left on the table, which is a common thing to notice once you've internalized the pattern: having a sorted container doesn't automatically mean your code is using the ordering.

## Time Based Key-Value Store (LC 981)

The problem: implement `set(key, value, timestamp)` and `get(key, timestamp)`, where `set` timestamps are strictly increasing per key, and `get` should return the value stored at the *largest* timestamp that is `<=` the query timestamp (or `""` if none exists). This is the classic floor/predecessor query.

```csharp
public class TimeMap
{
    private readonly Dictionary<string, SortedList<int, string>> data;

    public TimeMap()
    {
        data = new Dictionary<string, SortedList<int, string>>();
    }

    public void Set(string key, string value, int timestamp)
    {
        if (!data.TryGetValue(key, out var list))
        {
            list = new SortedList<int, string>();
            data[key] = list;
        }
        list.Add(timestamp, value);
    }

    public string Get(string key, int timestamp)
    {
        if (!data.TryGetValue(key, out var keys)) return "";

        var left = 0;
        var right = keys.Keys.Count - 1;
        var ans = -1;
        while (left <= right)
        {
            var mid = left + (right - left) / 2;
            if (keys.Keys[mid] == timestamp) return keys.Values[mid];
            if (keys.Keys[mid] <= timestamp)
            {
                ans = mid;
                left = mid + 1;
            }

            else
            {
                right = mid - 1;
            }
        }

        if (ans != -1) return keys.Values[ans];

        return "";
    }
}
```

Here the design is a `Dictionary<string, SortedList<int, string>>` — a hashmap for the O(1) key lookup, and a per-key `SortedList` to keep that key's timestamps ordered as they arrive. Since `Set` is documented to receive strictly increasing timestamps, every insert lands at the tail, so `list.Add` is effectively O(log n) amortized (SortedList keeps its backing array sorted, so worst case an insert can shift elements, but for a monotonic append pattern it's cheap in practice).

`Get` is a manual binary search over `keys.Keys` — no built-in "find predecessor" method on `SortedList`, so it's hand-rolled. The trick worth internalizing: instead of narrowing until `left == right` and then checking, it tracks `ans` — the best candidate found so far — every time `keys.Keys[mid] <= timestamp` is true. That candidate might still get beaten by a larger valid timestamp further right, so the search keeps going (`left = mid + 1`) instead of stopping. If `keys.Keys[mid]` overshoots, it discards the right half (`right = mid - 1`). By the time `left > right`, `ans` holds the index of the largest timestamp not exceeding the query — the classic "track the answer, don't stop at first match" shape you'll see in every floor/ceiling binary search. Both `Set` and `Get` are O(log n).

## Try it: watching the floor search

Below is that exact `Get` binary search, running against timestamps `[1, 4, 7, 9, 15, 20]` for `key = "k"`, querying `get("k", 12)`. The expected answer is `9` — the largest stored timestamp that doesn't exceed 12. Step through it and watch `left`/`right` close in while `ans` gets updated only when a candidate actually survives.

<div class="algoviz-wrap" id="viz-sorted-containers"></div>
<p class="algoviz-caption">Blue = current mid. Dimmed = eliminated range. Green outline = current best candidate for the answer; solid green = the final floor value.</p>

<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

<script>
(function () {
  var timestamps = [1, 4, 7, 9, 15, 20];
  var values = ['a', 'b', 'c', 'd', 'e', 'f'];
  var target = 12;

  // Mirror TimeMap.Get's binary search exactly, snapshotting state each iteration.
  function computeSteps(keys, target) {
    var steps = [];
    var left = 0, right = keys.length - 1, ans = -1;
    steps.push({ left: left, right: right, mid: null, ans: ans, phase: 'start' });

    while (left <= right) {
      var mid = left + Math.floor((right - left) / 2);

      if (keys[mid] === target) {
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'exact' });
        ans = mid;
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'done' });
        return steps;
      }

      if (keys[mid] <= target) {
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'probe' });
        ans = mid;
        left = mid + 1;
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'narrow' });
      } else {
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'probe' });
        right = mid - 1;
        steps.push({ left: left, right: right, mid: mid, ans: ans, phase: 'narrow' });
      }
    }

    steps.push({ left: left, right: right, mid: null, ans: ans, phase: 'done' });
    return steps;
  }

  var steps = computeSteps(timestamps, target);

  function render(stage, step) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 220;
      stage.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var n = timestamps.length;
    var boxW = 62, boxH = 56, gap = 8;
    var totalW = n * boxW + (n - 1) * gap;
    var startX = (canvas.width - totalW) / 2;
    var y = 60;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < n; i++) {
      var x = startX + i * (boxW + gap);
      var isDone = step.phase === 'done';
      var eliminated = isDone ? (i !== step.ans) : (i < step.left || i > step.right);
      var isMid = i === step.mid;
      var isAns = i === step.ans;

      var fill = null;
      var stroke = fg;
      var lineWidth = 1.5;

      if (isDone && isAns) {
        fill = '#2FA84F';
        stroke = '#2FA84F';
        lineWidth = 3;
      } else if (isMid) {
        fill = '#4C8BF5';
        stroke = '#4C8BF5';
        lineWidth = 3;
      } else if (isAns && !isDone) {
        stroke = '#2FA84F';
        lineWidth = 3;
      }

      ctx.globalAlpha = eliminated && !fill ? 0.3 : 1;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, boxW, boxH);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, boxW, boxH);

      ctx.fillStyle = fill ? '#ffffff' : fg;
      ctx.font = '13px monospace';
      ctx.fillText('t=' + timestamps[i], x + boxW / 2, y + boxH / 2 - 10);
      ctx.fillText('"' + values[i] + '"', x + boxW / 2, y + boxH / 2 + 10);
      ctx.globalAlpha = 1;

      ctx.fillStyle = fg;
      ctx.font = '11px monospace';
      ctx.fillText('idx ' + i, x + boxW / 2, y + boxH + 14);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = fg;
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    var info = 'get("k", ' + target + ')   left=' + step.left + '  right=' + step.right +
      '  mid=' + (step.mid === null ? '-' : step.mid) + '  ans=' + (step.ans === -1 ? '-' : step.ans);
    ctx.fillText(info, 10, 20);

    ctx.font = '12px monospace';
    var label = step.phase === 'done'
      ? 'done: floor(12) = t=' + timestamps[step.ans]
      : step.phase === 'exact'
        ? 'exact match at mid'
        : step.phase === 'probe'
          ? 'comparing keys[mid] to target'
          : 'range narrowed';
    ctx.fillText(label, 10, 38);
  }

  AlgoViz.mount(document.getElementById('viz-sorted-containers'), { steps: steps, render: render, initialSpeed: 700 });
})();
</script>

## Takeaways

Both problems reach for a sorted container, but for different reasons. `SortedDictionary` in the log system buys ordered iteration and O(log n) insert, though the retrieve path in this implementation doesn't actually exploit the ordering — it's a reminder that "I used a sorted structure" and "I got the sorted-structure speedup" aren't automatically the same claim. `SortedList` plus a hand-rolled binary search in the time map is the more classic use of the pattern: keep keys ordered so you can binary-search for a floor/predecessor in O(log n) instead of scanning. The `ans`-tracking binary search — keep searching after a hit instead of stopping — is the one piece of this I'll reuse the most; it's the same shape as finding the last occurrence, the insertion point, or any other "closest qualifying value" search.
