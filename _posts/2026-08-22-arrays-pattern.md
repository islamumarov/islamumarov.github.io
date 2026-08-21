---
layout: post
title: "Arrays Pattern"
date: 2026-08-22 09:00 +0300
tags: [algorithms, arrays, dfs, backtracking, leetcode]
categories: [algorithms, coding interview patterns]
---

<link rel="stylesheet" href="{{ '/assets/css/algo-viz.css' | relative_url }}">
<script src="{{ '/assets/js/algo-viz.js' | relative_url }}"></script>

## Intro

I keep a small C# repo where I re-solve LeetCode problems grouped by pattern, and the "Arrays" bucket is really where 2D-grid DFS lives for me. Whenever a problem gives me a grid of characters or numbers and asks "does some path/shape exist in here", my first instinct now is: DFS from every candidate starting cell, mark cells as visited while I'm standing on them, and unmark them the moment that branch fails. That's it — that's the whole pattern. It shows up under different names (grid traversal, backtracking on a matrix, flood-fill-with-a-twist) but the shape of the code barely changes between problems.

The problem that made this click for me is [LeetCode 79 — Word Search](https://leetcode.com/problems/word-search/).

## The problem

You get a 2D grid of letters and a target word. You need to say whether the word can be traced out by moving between horizontally/vertically adjacent cells, using each cell at most once per path. So `"ABCCED"` might exist starting at the top-left corner and snaking down through the grid, but you can't reuse a cell you've already stepped on earlier in that same path.

The naive idea — try every starting cell, and from each one try every direction, recursively — is exactly right. The only trick is bookkeeping which cells are "in use" for the *current* path, without allocating a separate visited array.

## The code

Here's the real implementation from my repo (`Arrays/LeetCode.Arrays/WordSearch.cs`), trimmed of `using`/`namespace` lines:

```csharp
public class WordSearch
{
    public static bool Exist(char[][] board, string word)
    {
        var direction = new int[][] { [0, -1], [0, 1], [-1, 0], [1, 0] };

        bool Dfs(int i, int j, int s)
        {
            if (s == word.Length)
            {
                return true;
            }
            if (i < 0 || i >= board.Length || j < 0 || j >= board[0].Length || board[i][j] != word[s])
            {
                return false;
            }
            var temp = board[i][j];
            board[i][j] = '#'; // Mark as visited
            foreach (var d in direction)
            {
                if (Dfs(i + d[0], j + d[1], s + 1))
                {
                    return true;
                }
            }
            board[i][j] = temp; // Unmark
            return false;
        }

        for (int i = 0; i < board.Length; i++)
        {
            for (int j = 0; j < board[0].Length; j++)
            {
                if (board[i][j] == word[0] && Dfs(i, j, 0))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
```

The neat trick here is `board[i][j] = '#'`. Instead of carrying around a second `bool[,] visited` array, the algorithm just overwrites the cell in place with a sentinel character that can never match a real letter of the word. That means the very next bounds/char check (`board[i][j] != word[s]`) naturally rejects any attempt to step back onto a cell that's already part of the current path — no extra lookup needed. Then, on the way back up the call stack, `board[i][j] = temp` restores the original letter so a *different* starting cell or a *different* branch can still use it later.

Walking through it:

- `Dfs(i, j, s)` asks: "can the substring `word[s..]` be traced starting at `(i, j)`?"
- Base case: if `s` already equals `word.Length`, we matched every character — success.
- Guard case: out of bounds, or this cell doesn't hold the letter we need — fail, and importantly, fail *before* touching the board, so we never mark a cell we didn't actually match.
- Otherwise: temporarily mark the cell visited, try all four directions for the next letter, and if none of them pan out, put the original letter back and report failure up to the caller.
- The outer double loop just tries every cell as a possible starting point for `word[0]`.

Complexity-wise, in the worst case you fan out from up to N·M starting cells, and each DFS branches into up to 4 directions per character of the word, so it's roughly **O(N·M·4^L)** where `L` is the word length. In practice it's much better than that because most branches die immediately on a letter mismatch — the `4^L` is a pessimistic ceiling, not what you actually see on typical inputs. Space is O(L) for the recursion stack (plus the in-place board mutation, which costs nothing extra).

## Try it

Below is the same algorithm running on a tiny 3x3 board, searching for `"ABCD"`. Watch the amber cell as it's tested, the blue trail as cells get marked, and — this is the part that took me a minute to really internalize — a red flash and un-mark when a branch dead-ends and the recursion has to climb back up and try a different direction. Step through it or hit play.

<div class="algoviz-wrap" id="viz-arrays"></div>
<p class="algoviz-caption">Green = matched path. Amber = current cell being tried. Red = mismatch or backtrack. Play or step through with the controls above.</p>

<script>
(function () {
  const board = [
    ['A', 'B', 'C'],
    ['S', 'C', 'S'],
    ['A', 'D', 'E']
  ];
  const word = 'ABCD';
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const rows = board.length, cols = board[0].length;
  const marked = board.map((r) => r.map(() => false));
  const path = [];
  const steps = [{ type: 'start', current: null, path: [], s: 0 }];

  function clonePath(p) { return p.map((pt) => pt.slice()); }
  function mkStep(type, current, s) {
    return { type, current: current ? current.slice() : null, path: clonePath(path), s };
  }

  function dfs(i, j, s) {
    if (s === word.length) return true;
    if (i < 0 || i >= rows || j < 0 || j >= cols) return false;
    steps.push(mkStep('try', [i, j], s));
    if (marked[i][j] || board[i][j] !== word[s]) {
      steps.push(mkStep('mismatch', [i, j], s));
      return false;
    }
    marked[i][j] = true;
    path.push([i, j]);
    steps.push(mkStep('mark', [i, j], s + 1));
    for (const [di, dj] of dirs) {
      if (dfs(i + di, j + dj, s + 1)) return true;
    }
    marked[i][j] = false;
    path.pop();
    steps.push(mkStep('backtrack', [i, j], s));
    return false;
  }

  let solved = false;
  for (let i = 0; i < rows && !solved; i++) {
    for (let j = 0; j < cols && !solved; j++) {
      if (board[i][j] === word[0] && dfs(i, j, 0)) solved = true;
    }
  }
  if (solved) steps.push(mkStep('found', path[path.length - 1], word.length));

  function describe(step) {
    const cur = step.current;
    switch (step.type) {
      case 'start':
        return 'Scanning the grid for a starting "' + word[0] + '"...';
      case 'try':
        return 'Trying \'' + word[step.s] + '\' at (' + cur[0] + ',' + cur[1] + ')';
      case 'mismatch':
        return 'No match at (' + cur[0] + ',' + cur[1] + ') — trying next direction';
      case 'mark':
        return 'Matched, ' + step.path.length + '/' + word.length + ' letters so far';
      case 'backtrack':
        return 'Dead end — unmarking (' + cur[0] + ',' + cur[1] + ') and backtracking';
      case 'found':
        return 'Found "' + word + '"!';
      default:
        return '';
    }
  }

  function render(stage, step) {
    let canvas = stage.querySelector('canvas');
    let note = stage.querySelector('.algoviz-note');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      stage.appendChild(canvas);
      note = document.createElement('div');
      note.className = 'algoviz-note';
      note.style.textAlign = 'center';
      note.style.marginTop = '8px';
      note.style.fontFamily = 'monospace';
      note.style.fontSize = '0.85rem';
      stage.appendChild(note);
    }

    const ctx = canvas.getContext('2d');
    const fg = getComputedStyle(document.body).color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cell = 90;
    const gridW = cols * cell, gridH = rows * cell;
    const offX = (canvas.width - gridW) / 2, offY = (canvas.height - gridH) / 2;

    const pathKey = new Set(step.path.map((p) => p[0] + ',' + p[1]));
    const curKey = step.current ? step.current[0] + ',' + step.current[1] : null;

    ctx.font = (cell * 0.4) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offX + c * cell, y = offY + r * cell;
        const key = r + ',' + c;
        let fill = null;
        if (step.type === 'found' && pathKey.has(key)) fill = '#2FA84F';
        else if (pathKey.has(key)) fill = '#4C8BF5';
        if (key === curKey && (step.type === 'try' || step.type === 'mismatch' || step.type === 'backtrack')) {
          fill = step.type === 'try' ? '#E8871E' : '#E5484D';
        }
        if (fill) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, cell, cell);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cell, cell);
        ctx.fillStyle = fg;
        ctx.fillText(board[r][c], x + cell / 2, y + cell / 2);
      }
    }

    note.textContent = describe(step);
  }

  AlgoViz.mount(document.getElementById('viz-arrays'), { steps, render, initialSpeed: 500 });
})();
</script>

Notice the middle of the run: the DFS commits to `(0,2)`, tries all three of its unvisited neighbors, finds none of them hold the letter `D`, and has to unmark `(0,2)` and hand control back to `(0,1)` — which then tries a completely different neighbor, `(1,1)`, and that branch goes on to succeed. That unmark-and-retry is the entire "backtracking" part of the pattern in one frame.

## Takeaways

- The `'#'` sentinel trick is the reusable idea here: when you need a "currently in this path" marker and you already have a mutable grid, overwrite in place instead of allocating a parallel visited structure — just remember to restore it before returning.
- Always check bounds/character-match *before* mutating the cell, so failed attempts never leave the grid in a wrong state.
- Complexity is bounded by O(N·M·4^L), but real inputs prune hard and fast because most letters just don't match — don't let the worst-case scare you off using this pattern.

Next up in this series: more patterns from the same repo, same format.
