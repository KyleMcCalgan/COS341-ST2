# Chapter 6 — Intermediate-Code Generation: Textbook Rule Reference

**Source:** Torben Ægidius Mogensen, *Introduction to Compiler Design*, 2nd ed., Chapter 6.  
**Purpose:** A directly usable, organised reference to the translation-rule figures, including the easy-to-miss short-circuit rules.  
**Notation:** `++` concatenates instruction lists; `[ ... ]` is an instruction list; `place` is the target intermediate-code variable; `vtable`/`ftable` map source identifiers to intermediate names. `newvar()` and `newlabel()` generate fresh names. The variable names used within each rule are **local to that invocation**. Functions named `TransExp`, `TransExps`, `TransStat`, `TransCond`, `TransIndexed`, `CalcIndexed`, and `TransDecl` follow textbook figure notation (subscripts omitted in plaintext).

> **Scope:** All seven *explicit translation-rule tables* in Chapter 6 (Figures 6.3, 6.5, 6.6, 6.8, 6.9, 6.11, 6.12) are transcribed below. Figures 6.1, 6.2, 6.4, and 6.7 describe the intermediate language or grammars, and Figure 6.10 is an array diagram; they are indexed at the end. Code blocks express each rule's algorithm rather than executable Python/JavaScript.

## Quick navigation

| Section | Figure | What to use it for | PDF page |
|---|---|---|---|
| 6.4 | **6.3** | `TransExp`: constants, identifiers, unary/binary operators, function calls; `TransExps` | 209 |
| 6.5 | **6.5** | `TransStat`: sequences, assignments, `if`, `if/else`, `while`, `repeat/until` | 213 |
| 6.5 | **6.6** | `TransCond`: simple relational comparison | 213 (caption on 214) |
| 6.6.1 | **6.8** | `true`, `false`, `!`, `&&`, `||`, and expression/condition conversions | 218 |
| 6.8.2 | **6.9** | One-dimensional array loads, stores, and addresses | 223 |
| 6.8.2 | **6.11** | Multi-dimensional array subscripts, row-major | 226 |
| 6.9.1 | **6.12** | Simple declarations and local variable bindings | 231 |

---

## Figure 6.3 — Translating an expression (§6.4; PDF p. 209)

`TransExp(Exp, vtable, ftable, place) = case Exp of`

### 6.3.A — `num`
```text
v = getvalue(num)
[place := v]
```

### 6.3.B — `id`
```text
x = lookup(vtable, getname(id))
[place := x]
```

### 6.3.C — `unop Exp1`
```text
place1 = newvar()
code1 = TransExp(Exp1, vtable, ftable, place1)
op = transop(getopname(unop))
code1 ++ [place := op place1]
```

### 6.3.D — `Exp1 binop Exp2`
```text
place1 = newvar()
place2 = newvar()
code1 = TransExp(Exp1, vtable, ftable, place1)
code2 = TransExp(Exp2, vtable, ftable, place2)
op = transop(getopname(binop))
code1 ++ code2 ++ [place := place1 op place2]
```

### 6.3.E — `id(Exps)` (function call)
```text
(code1, [a1, ..., an]) = TransExps(Exps, vtable, ftable)
fname = lookup(ftable, getname(id))
code1 ++ [place := CALL fname(a1, ..., an)]
```

`TransExps(Exps, vtable, ftable) = case Exps of`

### 6.3.F — `Exp` (one expression in the list)
```text
place = newvar()
code1 = TransExp(Exp, vtable, ftable, place)
(code1, [place])
```

### 6.3.G — `Exp, Exps` (head followed by remaining list)
```text
place = newvar()
code1 = TransExp(Exp, vtable, ftable, place)
(code2, args) = TransExps(Exps, vtable, ftable)
code3 = code1 ++ code2
args1 = place :: args
(code3, args1)
```

**Reminder:** In a binary expression, allocate both `place1` and `place2` **before** recursively translating either child. The child's instructions are output **before** the parent's final operation.

---

## Figure 6.5 — Translation of statements (§6.5; PDF p. 213)

`TransStat(Stat, vtable, ftable) = case Stat of`

### 6.5.A — `Stat1 ; Stat2`
```text
code1 = TransStat(Stat1, vtable, ftable)
code2 = TransStat(Stat2, vtable, ftable)
code1 ++ code2
```

### 6.5.B — `id := Exp`
```text
place = newvar()
x = lookup(vtable, getname(id))
TransExp(Exp, vtable, ftable, place) ++ [x := place]
```

### 6.5.C — `if Cond then Stat1`
```text
label1 = newlabel()
label2 = newlabel()
code1 = TransCond(Cond, label1, label2, vtable, ftable)
code2 = TransStat(Stat1, vtable, ftable)
code1 ++ [LABEL label1] ++ code2 ++ [LABEL label2]
```

### 6.5.D — `if Cond then Stat1 else Stat2`
```text
label1 = newlabel()
label2 = newlabel()
label3 = newlabel()
code1 = TransCond(Cond, label1, label2, vtable, ftable)
code2 = TransStat(Stat1, vtable, ftable)
code3 = TransStat(Stat2, vtable, ftable)
code1 ++ [LABEL label1] ++ code2
      ++ [GOTO label3, LABEL label2]
      ++ code3 ++ [LABEL label3]
```

### 6.5.E — `while Cond do Stat1`
```text
label1 = newlabel()
label2 = newlabel()
label3 = newlabel()
code1 = TransCond(Cond, label2, label3, vtable, ftable)
code2 = TransStat(Stat1, vtable, ftable)
[LABEL label1] ++ code1
               ++ [LABEL label2] ++ code2
               ++ [GOTO label1, LABEL label3]
```

### 6.5.F — `repeat Stat1 until Cond`
```text
label1 = newlabel()
label2 = newlabel()
code1 = TransStat(Stat1, vtable, ftable)
code2 = TransCond(Cond, label2, label1, vtable, ftable)
[LABEL label1] ++ code1 ++ code2 ++ [LABEL label2]
```

**Exam note:** `while` tests before the body; `repeat-until` tests after the body. In the `repeat-until` call, **true → exit (`label2`)** and **false → repeat (`label1`)**.

**Past-paper extension — `do Stat while Cond` (NOT a textbook Figure 6.5 row):** If the requested code structure is `[LABEL label1] ++ bodyCode ++ boolCode ++ [LABEL label2]`, call `TransCond(Cond, label1, label2, vtable, ftable)`: **true → repeat**, **false → exit**.

---

## Figure 6.6 — Translation of simple conditions (§6.5; PDF pp. 213–214)

`TransCond(Cond, labelT, labelF, vtable, ftable) = case Cond of`

### 6.6.A — `Exp1 relop Exp2`
```text
t1 = newvar()
t2 = newvar()
code1 = TransExp(Exp1, vtable, ftable, t1)
code2 = TransExp(Exp2, vtable, ftable, t2)
op = transop(getopname(relop))
code1 ++ code2 ++ [IF t1 op t2 THEN labelT ELSE labelF]
```

**Parameters:** `labelT` is the jump destination when the condition is **true**; `labelF` is the destination when **false**. The rule translates a **single comparison**. It does **not** translate an entire `&&` or `||` tree.

---

## Figure 6.8 — Translation of sequential logical operators (§6.6.1; PDF p. 218)

This figure **extends** both `TransExp` and `TransCond`. Earlier cases from Figures 6.3 and 6.6 remain available.

### Extra `TransExp(Exp, vtable, ftable, place)` rows

**6.8.A — `true`**
```text
[place := 1]
```

**6.8.B — `false`**
```text
[place := 0]
```

**6.8.C — `Cond` used as an expression**
```text
label1 = newlabel()
label2 = newlabel()
code1 = TransCond(Cond, label1, label2, vtable, ftable)
[place := 0] ++ code1
             ++ [LABEL label1, place := 1]
             ++ [LABEL label2]
```

### `TransCond(Cond, labelT, labelF, vtable, ftable)` rows

**6.8.D — `Exp1 relop Exp2`** (same relational rule as Figure 6.6)
```text
t1 = newvar()
t2 = newvar()
code1 = TransExp(Exp1, vtable, ftable, t1)
code2 = TransExp(Exp2, vtable, ftable, t2)
op = transop(getopname(relop))
code1 ++ code2 ++ [IF t1 op t2 THEN labelT ELSE labelF]
```

**6.8.E — `true`**
```text
[GOTO labelT]
```

**6.8.F — `false`**
```text
[GOTO labelF]
```

**6.8.G — `! Cond1`** (logical negation)
```text
TransCond(Cond1, labelF, labelT, vtable, ftable)
```

**6.8.H — `Cond1 && Cond2`** (short-circuit AND)
```text
arg2 = newlabel()
code1 = TransCond(Cond1, arg2, labelF, vtable, ftable)
code2 = TransCond(Cond2, labelT, labelF, vtable, ftable)
code1 ++ [LABEL arg2] ++ code2
```

**6.8.I — `Cond1 || Cond2`** (short-circuit OR)
```text
arg2 = newlabel()
code1 = TransCond(Cond1, labelT, arg2, vtable, ftable)
code2 = TransCond(Cond2, labelT, labelF, vtable, ftable)
code1 ++ [LABEL arg2] ++ code2
```

**6.8.J — `Exp` treated as a condition** (the fallback rule)
```text
t = newvar()
code1 = TransExp(Exp, vtable, ftable, t)
code1 ++ [IF t != 0 THEN labelT ELSE labelF]
```

**Rule-selection test:**

| Outermost AST pattern | Choose |
|---|---|
| `x > 80` | 6.6.A / 6.8.D: `relop` |
| `(x > 80) && (x < 100)` | **6.8.H `&&` first**, then relational rules for children |
| `Cond1 || Cond2` | 6.8.I `||` |
| `! Cond1` | 6.8.G `!` |
| `true` or `false` as a condition | 6.8.E / 6.8.F |

---

## Figure 6.9 — Translation for one-dimensional arrays (§6.8.2; PDF p. 223)

The textbook assumes **4-byte integer elements**. `M[address]` denotes memory at an address. `TransIndexed` returns `(code, address)`.

### 6.9.A — `TransExp`: `Indexed`
```text
(code1, address) = TransIndexed(Indexed, vtable, ftable)
code1 ++ [place := M[address]]
```

### 6.9.B — `TransStat`: `Indexed := Exp`
```text
(code1, address) = TransIndexed(Indexed, vtable, ftable)
t = newvar()
code2 = TransExp(Exp, vtable, ftable, t)
code1 ++ code2 ++ [M[address] := t]
```

### 6.9.C — `TransIndexed`: `id[Exp]`
```text
base = lookup(vtable, getname(id))
t = newvar()
code1 = TransExp(Exp, vtable, ftable, t)
code2 = code1 ++ [t := t * 4, t := t + base]
(code2, t)
```

---

## Figure 6.11 — Translation of multi-dimensional arrays (§6.8.2; PDF p. 226)

This is **row-major** indexing. `CalcIndexed` accumulates a flattened index and returns `(code, t, base, dims)`; `TransIndexed` then scales by the element size and adds the base address.

### 6.11.A — `TransExp`: `Indexed`
```text
(code1, address) = TransIndexed(Indexed, vtable, ftable)
code1 ++ [place := M[address]]
```

### 6.11.B — `TransStat`: `Indexed := Exp`
```text
(code1, address) = TransIndexed(Indexed, vtable, ftable)
t = newvar()
code2 = TransExp(Exp, vtable, ftable, t)
code1 ++ code2 ++ [M[address] := t]
```

### 6.11.C — `TransIndexed(Indexed, vtable, ftable)`
```text
(code1, t, base, []) = CalcIndexed(Indexed, vtable, ftable)
code2 = code1 ++ [t := t * 4, t := t + base]
(code2, t)
```

### 6.11.D — `CalcIndexed`: `id[Exp]`
```text
(base, dims) = lookup(vtable, getname(id))
t = newvar()
code = TransExp(Exp, vtable, ftable, t)
(code, t, base, tail(dims))
```

### 6.11.E — `CalcIndexed`: `Indexed[Exp]`
```text
(code1, t1, base, dims) = CalcIndexed(Indexed, vtable, ftable)
dim1 = head(dims)
t2 = newvar()
code2 = TransExp(Exp, vtable, ftable, t2)
code3 = code1 ++ code2 ++ [t1 := t1 * dim1, t1 := t1 + t2]
(code3, t1, base, tail(dims))
```

**Grammar extension:** `Indexed → id[Exp]` or `Indexed → Indexed[Exp]`. Figure 6.11 supersedes the one-dimensional `TransIndexed` rule when indexing across multiple dimensions.

---

## Figure 6.12 — Translation of simple declarations (§6.9.1; PDF p. 231)

### 6.12.A — `TransStat`: `Decl ; Stat1`
```text
(code1, vtable1) = TransDecl(Decl, vtable)
code2 = TransStat(Stat1, vtable1, ftable)
code1 ++ code2
```

### 6.12.B — `TransDecl`: `int id`
```text
t1 = newvar()
vtable1 = bind(vtable, getname(id), t1)
([], vtable1)
```

### 6.12.C — `TransDecl`: `int id[num]`
```text
t1 = newvar()
vtable1 = bind(vtable, getname(id), t1)
([t1 := HP, HP := HP + (4 * getvalue(num))], vtable1)
```

**Note:** `HP` is the heap pointer in the textbook's intermediate representation. An ordinary scalar declaration adds a binding and produces no instructions; an array declaration allocates space.

---

## Other figures and grammars in Chapter 6

The following are **not additional recursive translation-rule tables** but belong to the chapter's complete reference set.

| Figure | Description | How it relates |
|---|---|---|
| **6.1** | The intermediate language | Defines instruction forms used as the output of all rules |
| **6.2** | A simple expression language | Grammar for the cases in Figure 6.3 |
| **6.4** | Statement language | Grammar for the statement cases in Figure 6.5 |
| **6.7** | Example language with logical operators | Grammar additions underlying Figure 6.8 |
| **6.10** | A two-dimensional array | Diagram explaining row-major layout for Figure 6.11 |

Section **6.9.2** discusses translating function declarations and returns in prose rather than supplying another numbered translation-rule table. It introduces mapping function and parameter names into internal names and translating bodies. Chapter 9 explains how call/return operations are implemented at a lower level.

## Quick exam workflow

1. Match the **outermost** expression/statement/condition with its figure row. Do **not** use `relop` directly when the outer operator is `&&` or `||`.
2. Copy that rule's `newvar()` / `newlabel()` calls **in their written order**.
3. Park the parent rule and expand recursive calls from left to right (unless the rule specifies otherwise).
4. Record each call's own `code1`, `code2`, etc. These names are local: distinguish `parent.code1` from `child.code1`.
5. Concatenate returned code **in the rule's specified order**, which may differ from temporary-allocation order.
6. For `TransCond`, always write `labelT` and `labelF` beside the call before expanding it.

### Example: repeat-until with short-circuit AND

```text
repeat { x := ((x * 2) - 5) }
until ((x > 80) && (x < 100))
```

The **rule hierarchy** is:

```text
TransStat(repeat ... until ...)     [Fig. 6.5.F]
  label1 = L1; label2 = L2
  body = TransStat(x := ..., ...)  [Fig. 6.5.B]
  cond = TransCond((x>80)&&(x<100), L2, L1, ...) [Fig. 6.8.H]
    arg2 = L3
    left = TransCond(x>80, L3, L1, ...)  [Fig. 6.8.D]
    right = TransCond(x<100, L2, L1, ...) [Fig. 6.8.D]
    left ++ [LABEL L3] ++ right
  [LABEL L1] ++ body ++ cond ++ [LABEL L2]
```

The condition is **false → L1 (repeat)**; **true → L2 (exit)**. The first part of `&&` goes to `L3` on success, enabling the second test.

---

*End of Chapter 6 translation-rule reference. Source figures and their page locations are in the uploaded prescribed textbook; the PDF page numbers above count from the beginning of the provided PDF.*
