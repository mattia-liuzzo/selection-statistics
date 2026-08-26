# Selection Statistics

Quickly calculate statistics from selected numeric values directly in Visual Studio Code.

Select one or more blocks of text containing numbers and Selection Statistics will instantly calculate:

- Sum (Σ)
- Average (μ)
- Median
- Minimum
- Maximum
- Count

Results are displayed in the Status Bar and can be copied to the clipboard with a single click.

---

## Features

### Real-time statistics

Select any text containing numeric values:

```text
10
15
20
35
```

Selection Statistics displays:

```text
Σ 80 | μ 20 | n 4
```

### Multiple selections

Works with multiple cursors and multiple selections.

### Supports

- Integers
- Decimal numbers
- Negative values
- Scientific notation

Examples:

```text
12
-45.5
3.14159
1.2e3
```

---

## Copy Results

Click the calculator icon in the Status Bar or run:

```text
Selection Statistics: Copy Result
```

The extension can export results in multiple formats.

### Text

```text
Lines: 4
Count: 4
Sum: 80
Avg: 20
Median: 17.5
Min: 10
Max: 35
```