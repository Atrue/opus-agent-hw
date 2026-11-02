#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генератор мок-трейса XOR 2-3-1 для кликабельного прототипа (план 01-01, D-03).

Единственный источник чисел прототипа: Python 3.9 stdlib-only (math/random/json),
микrograd-семантика скалярного autodiff (Value + topo backward). Пишет
src/data/xor-trace.json байт-стабильно (фиксированные separators, без timestamp).

Самопроверки:
  * санити-фильтр весов (RESEARCH §3.4): начальный L в [0.4, 1.0],
    все |pre-tanh| и |pre-sigmoid| < 2.5, веса в ±1, |∂L/∂W1| > 1e-4;
  * central-difference gradcheck каждого аналитического градиента
    (h = 1e-6, допуск rel 1e-4) — ненулевой exit-код при расхождении.

Запуск из корня репо: python3 tools/reference/gen_mock_trace.py
"""
import json
import math
import os
import random
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_PATH = os.path.join(REPO_ROOT, "src", "data", "xor-trace.json")

SEED_START = 42
MAX_SEED_TRIES = 1000
LR = 0.5
X = [1.0, 0.0]
Y = 1
GRADCHECK_H = 1e-6
GRADCHECK_TOL = 1e-4


class Value(object):
    """Скаляр с градиентом — семантика micrograd (data/grad/_backward/_parents)."""

    def __init__(self, data, parents=(), op=""):
        self.data = data
        self.grad = 0.0
        self.op = op
        self._parents = parents
        self._backward = lambda: None


def _noop():
    return None


def vadd(a, b):
    out = Value(a.data + b.data, (a, b), "+")

    def _bw():
        a.grad += out.grad
        b.grad += out.grad

    out._backward = _bw
    return out


def vmul(a, b):
    out = Value(a.data * b.data, (a, b), "*")

    def _bw():
        a.grad += out.grad * b.data
        b.grad += out.grad * a.data

    out._backward = _bw
    return out


def vneg(a):
    out = Value(-a.data, (a,), "neg")

    def _bw():
        a.grad += -out.grad

    out._backward = _bw
    return out


def vsub(a, b):
    return vadd(a, vneg(b))


def vtanh(a):
    out = Value(math.tanh(a.data), (a,), "tanh")

    def _bw():
        a.grad += out.grad * (1.0 - out.data * out.data)

    out._backward = _bw
    return out


def vsigmoid(a):
    s = 1.0 / (1.0 + math.exp(-a.data))
    out = Value(s, (a,), "sigmoid")

    def _bw():
        a.grad += out.grad * s * (1.0 - s)

    out._backward = _bw
    return out


def vlog(a):
    out = Value(math.log(a.data), (a,), "log")

    def _bw():
        a.grad += out.grad / a.data

    out._backward = _bw
    return out


def backward(root):
    """Топологическая развёртка графа + обратный проход (micrograd-канон)."""
    topo = []
    visited = set()

    def build(v):
        if id(v) not in visited:
            visited.add(id(v))
            for p in v._parents:
                build(p)
            topo.append(v)

    build(root)
    root.grad = 1.0
    for v in reversed(topo):
        v._backward()


def gen_weights(rng):
    """Фиксированный порядок вызовов rng → детерминизм seed → веса."""
    w1 = [[rng.uniform(-1.0, 1.0) for _ in range(2)] for _ in range(3)]
    b1 = [rng.uniform(-1.0, 1.0) for _ in range(3)]
    w2 = [[rng.uniform(-1.0, 1.0) for _ in range(3)]]
    b2 = [rng.uniform(-1.0, 1.0)]
    return w1, b1, w2, b2


def forward_numeric(w1, b1, w2, b2, x, y):
    """Forward-pass чистой математикой — для санити-фильтра, gradcheck и loss-after-update."""
    z1 = [w1[j][0] * x[0] + w1[j][1] * x[1] + b1[j] for j in range(3)]
    a1 = [math.tanh(z) for z in z1]
    z2 = w2[0][0] * a1[0] + w2[0][1] * a1[1] + w2[0][2] * a1[2] + b2[0]
    yhat = 1.0 / (1.0 + math.exp(-z2))
    loss = -(y * math.log(yhat) + (1 - y) * math.log(1.0 - yhat))
    return {"loss": loss, "z1": z1, "a1": a1, "z2": z2, "yhat": yhat}


def build_graph(w1, b1, w2, b2, x, y):
    """Граф Value-нод: x → matvec → +b → tanh → matvec → +b → sigmoid → bce."""
    xv = [Value(x[0], op="input"), Value(x[1], op="input")]
    w1v = [[Value(w1[j][i], op="param") for i in range(2)] for j in range(3)]
    b1v = [Value(b1[j], op="param") for j in range(3)]
    w2v = [[Value(w2[0][j], op="param") for j in range(3)]]
    b2v = [Value(b2[0], op="param")]

    z1_pre = []
    for j in range(3):
        acc = vmul(w1v[j][0], xv[0])
        acc = vadd(acc, vmul(w1v[j][1], xv[1]))
        z1_pre.append(acc)
    z1 = [vadd(z1_pre[j], b1v[j]) for j in range(3)]
    a1 = [vtanh(z) for z in z1]

    acc2 = vmul(w2v[0][0], a1[0])
    acc2 = vadd(acc2, vmul(w2v[0][1], a1[1]))
    acc2 = vadd(acc2, vmul(w2v[0][2], a1[2]))
    z2_pre = acc2
    z2 = vadd(z2_pre, b2v[0])
    yhat = vsigmoid(z2)

    yv = Value(float(y), op="const")
    one_v = Value(1.0, op="const")
    zero_v = Value(0.0, op="const")
    term1 = vmul(yv, vlog(yhat))
    term2 = vmul(zero_v, vlog(vsub(one_v, yhat)))
    loss = vneg(vadd(term1, term2))

    return {
        "x": xv, "w1": w1v, "b1": b1v, "w2": w2v, "b2": b2v,
        "z1_pre": z1_pre, "z1": z1, "a1": a1,
        "z2_pre": z2_pre, "z2": z2, "yhat": yhat, "loss": loss,
    }


def sanity_ok(w1, b1, w2, b2, g):
    """Санити-фильтр весов (RESEARCH §3.4). g — граф после backward()."""
    fwd = forward_numeric(w1, b1, w2, b2, X, Y)
    if not (0.4 <= fwd["loss"] <= 1.0):
        return False
    for z in fwd["z1"]:
        if abs(z) >= 2.5:
            return False
    if abs(fwd["z2"]) >= 2.5:
        return False
    flat = [w for row in w1 for w in row] + list(b1) + list(w2[0]) + list(b2)
    for w in flat:
        if abs(w) > 1.0:
            return False
    max_dw1 = max(abs(v.grad) for row in g["w1"] for v in row)
    if max_dw1 <= 1e-4:
        return False
    return True


def find_seed():
    """Перебор seed от 42 вверх до прохождения санити-фильтра."""
    for seed in range(SEED_START, SEED_START + MAX_SEED_TRIES):
        rng = random.Random(seed)
        w1, b1, w2, b2 = gen_weights(rng)
        g = build_graph(w1, b1, w2, b2, X, Y)
        backward(g["loss"])
        if sanity_ok(w1, b1, w2, b2, g):
            return seed, w1, b1, w2, b2, g
    sys.stderr.write("sanity filter failed for %d seeds\n" % MAX_SEED_TRIES)
    sys.exit(1)


def gradcheck(w1, b1, w2, b2, g):
    """Central-difference проверка каждого аналитического градиента (RESEARCH §3.5).

    Параметры адресуются как (список-строка, индекс), чтобы возмущение ±h
    действительно попадало в w1/b1/w2/b2, которые читает forward_numeric.
    """
    analytic = []
    for row in g["w1"]:
        analytic.extend(v.grad for v in row)
    analytic.extend(v.grad for v in g["b1"])
    analytic.extend(v.grad for v in g["w2"][0])
    analytic.append(g["b2"][0].grad)

    slots = []
    for row in w1:
        for i in range(len(row)):
            slots.append((row, i))
    for j in range(len(b1)):
        slots.append((b1, j))
    for j in range(len(w2[0])):
        slots.append((w2[0], j))
    slots.append((b2, 0))
    assert len(slots) == len(analytic)

    max_rel = 0.0
    for k in range(len(slots)):
        row, idx = slots[k]
        saved = row[idx]

        row[idx] = saved + GRADCHECK_H
        lp = forward_numeric(w1, b1, w2, b2, X, Y)["loss"]

        row[idx] = saved - GRADCHECK_H
        lm = forward_numeric(w1, b1, w2, b2, X, Y)["loss"]

        row[idx] = saved
        numeric = (lp - lm) / (2.0 * GRADCHECK_H)
        rel = abs(numeric - analytic[k]) / max(abs(analytic[k]), 1e-12)
        if rel > max_rel:
            max_rel = rel
    if max_rel > GRADCHECK_TOL:
        sys.stderr.write("gradcheck FAILED: maxRelErr %r > tol %r\n" % (max_rel, GRADCHECK_TOL))
        sys.exit(1)
    return max_rel


def tensor(sym, values, provenance=None):
    """Вход/выход шага: sym + shape + values (+ provenance для входов)."""
    if isinstance(values[0], (int, float)):
        shape = [len(values)]
    else:
        shape = [len(values), len(values[0])]
    entry = {"sym": sym, "shape": shape, "values": values}
    if provenance is not None:
        entry["provenance"] = provenance
    return entry


def datas(nodes):
    return [v.data for v in nodes]


def grads_of(rows):
    return [[v.grad for v in row] for row in rows]


def build_steps(seed, w1, b1, w2, b2, g, updated):
    """Развёртка графа в 14 шагов walkthrough (RESEARCH §3.2).

    Нотация (план Б §5.5, глиф-проверка 01-02): индексы — ASCII («z1», «W2»),
    UI рендерит цифры после буквы как <sub>. Используются только глифы,
    покрытые JetBrains Mono / Inter: − · ² ᵀ σ ŷ η ‖ ∂ (∂ — системный фолбэк).
    Не покрыты и потому запрещены: ₁ ₂ (U+2080..), *, ←, →.
    """
    seed_note = "вес, инициализация (seed %d)" % seed
    yhat = g["yhat"].data
    loss = g["loss"].data
    dw2 = [v.grad for v in g["w2"][0]]
    w2_00_after = updated["w2"][0][0]

    steps = [
        {
            "index": 0, "phase": "forward", "op": "matvec", "layer": 1,
            "formula": "z1 = W1·x",
            "narrative": {"ru": "Каждый скрытый нейрон считает скалярное произведение своей строки W1 на вход x — первый шаг forward-pass."},
            "inputs": [
                tensor("W1", [[c.data for c in row] for row in g["w1"]], seed_note),
                tensor("x", datas(g["x"]), "входные данные — граница графа"),
            ],
            "outputs": tensor("z1", datas(g["z1_pre"])),
            "grads": None, "changed": ["z1"],
        },
        {
            "index": 1, "phase": "forward", "op": "add", "layer": 1,
            "formula": "z1 = z1 + b1",
            "narrative": {"ru": "Каждый нейрон добавляет свой биас b1 — сдвиг, который не зависит от входа."},
            "inputs": [
                tensor("z1", datas(g["z1_pre"]), "шаг 1 (matvec)"),
                tensor("b1", datas(g["b1"]), seed_note),
            ],
            "outputs": tensor("z1", datas(g["z1"])),
            "grads": None, "changed": ["z1"],
        },
        {
            "index": 2, "phase": "forward", "op": "tanh", "layer": 1,
            "formula": "a1 = tanh(z1)",
            "narrative": {"ru": "Нелинейность: tanh зажимает каждое число в (−1, 1) — без неё любой стек слоёв оставался бы линейным."},
            "inputs": [tensor("z1", datas(g["z1"]), "шаг 2 (add)")],
            "outputs": tensor("a1", datas(g["a1"])),
            "grads": None, "changed": ["a1"],
        },
        {
            "index": 3, "phase": "forward", "op": "matvec", "layer": 2,
            "formula": "z2 = W2·a1",
            "narrative": {"ru": "Выходной нейрон собирает взвешенную сумму активаций скрытого слоя."},
            "inputs": [
                tensor("W2", [[c.data for c in row] for row in g["w2"]], seed_note),
                tensor("a1", datas(g["a1"]), "шаг 3 (tanh)"),
            ],
            "outputs": tensor("z2", [g["z2_pre"].data]),
            "grads": None, "changed": ["z2"],
        },
        {
            "index": 4, "phase": "forward", "op": "add", "layer": 2,
            "formula": "z2 = z2 + b2",
            "narrative": {"ru": "Выходной биас b2 — последний сдвиг перед активацией."},
            "inputs": [
                tensor("z2", [g["z2_pre"].data], "шаг 4 (matvec)"),
                tensor("b2", datas(g["b2"]), seed_note),
            ],
            "outputs": tensor("z2", [g["z2"].data]),
            "grads": None, "changed": ["z2"],
        },
        {
            "index": 5, "phase": "forward", "op": "sigmoid", "layer": 2,
            "formula": "ŷ = σ(z2)",
            "narrative": {"ru": "σ переводит любое число в вероятность ŷ ∈ (0, 1) — это прогноз сети для входа x."},
            "inputs": [tensor("z2", [g["z2"].data], "шаг 5 (add)")],
            "outputs": tensor("ŷ", [yhat]),
            "grads": None, "changed": ["yhat"],
        },
        {
            "index": 6, "phase": "loss", "op": "bce", "layer": 2,
            "formula": "L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]",
            "narrative": {"ru": "Binary cross-entropy измеряет, насколько прогноз ŷ промахнулся относительно правильного ответа y. Именно это число будем уменьшать."},
            "inputs": [
                tensor("ŷ", [yhat], "шаг 6 (sigmoid)"),
                tensor("y", [float(Y)], "метка — граница графа"),
            ],
            "outputs": tensor("L", [loss]),
            "grads": None, "changed": ["L"],
        },
        {
            "index": 7, "phase": "backward", "op": "bce-grad", "layer": 2,
            "formula": "∂L/∂ŷ = −(y−ŷ)/(ŷ(1−ŷ))",
            "narrative": {"ru": "Старт backward-pass: насколько нужно сдвинуть ŷ, чтобы L уменьшился. Это производная BCE по прогнозу."},
            "inputs": [
                tensor("ŷ", [yhat], "шаг 6 (sigmoid)"),
                tensor("y", [float(Y)], "метка — граница графа"),
            ],
            "outputs": tensor("∂L/∂ŷ", [g["yhat"].grad]),
            "grads": {"∂L/∂ŷ": [g["yhat"].grad]},
            "changed": ["dyhat"],
        },
        {
            "index": 8, "phase": "backward", "op": "sigmoid-grad", "layer": 2,
            "formula": "∂L/∂z2 = ∂L/∂ŷ · ŷ(1−ŷ)",
            "narrative": {"ru": "Цепное правило: градиент протекает через σ обратно к z2 — умножаем на локальную производную σ(z2) = ŷ(1−ŷ)."},
            "inputs": [tensor("∂L/∂ŷ", [g["yhat"].grad], "шаг 8 (bce-grad)")],
            "outputs": tensor("∂L/∂z2", [g["z2"].grad]),
            "grads": {"∂L/∂z2": [g["z2"].grad]},
            "changed": ["dz2"],
        },
        {
            "index": 9, "phase": "backward", "op": "matvec-grad", "layer": 2,
            "formula": "∂L/∂W2 = ∂L/∂z2 · a1ᵀ,  ∂L/∂b2 = ∂L/∂z2,  ∂L/∂a1 = W2ᵀ·∂L/∂z2",
            "narrative": {"ru": "Градиент matvec-а: градиент веса = восходящий градиент × активация-вход этой связи; ∂L/∂a1 уходит дальше вглубь сети."},
            "inputs": [
                tensor("∂L/∂z2", [g["z2"].grad], "шаг 9 (sigmoid-grad)"),
                tensor("a1", datas(g["a1"]), "шаг 3 (tanh)"),
            ],
            "outputs": tensor("∂L/∂W2", grads_of(g["w2"])),
            "grads": {
                "∂L/∂W2": grads_of(g["w2"]),
                "∂L/∂b2": [g["b2"][0].grad],
                "∂L/∂a1": [v.grad for v in g["a1"]],
            },
            "changed": ["dW2", "db2", "da1"],
        },
        {
            "index": 10, "phase": "backward", "op": "tanh-grad", "layer": 1,
            "formula": "∂L/∂z1 = ∂L/∂a1 * (1−a1²)",
            "narrative": {"ru": "Через tanh: на месте каждой активации умножаем восходящий градиент на производную 1−a1²."},
            "inputs": [tensor("∂L/∂a1", [v.grad for v in g["a1"]], "шаг 10 (matvec-grad)")],
            "outputs": tensor("∂L/∂z1", [v.grad for v in g["z1"]]),
            "grads": {"∂L/∂z1": [v.grad for v in g["z1"]]},
            "changed": ["dz1"],
        },
        {
            "index": 11, "phase": "backward", "op": "matvec-grad", "layer": 1,
            "formula": "∂L/∂W1 = ∂L/∂z1 · xᵀ,  ∂L/∂b1 = ∂L/∂z1,  ∂L/∂x = W1ᵀ·∂L/∂z1",
            "narrative": {"ru": "Градиенты первого слоя. ∂L/∂x дальше не распространяется: x — вход, старт цепного правила."},
            "inputs": [
                tensor("∂L/∂z1", [v.grad for v in g["z1"]], "шаг 11 (tanh-grad)"),
                tensor("x", datas(g["x"]), "входные данные — граница графа"),
            ],
            "outputs": tensor("∂L/∂W1", grads_of(g["w1"])),
            "grads": {
                "∂L/∂W1": grads_of(g["w1"]),
                "∂L/∂b1": [v.grad for v in g["b1"]],
                "∂L/∂x": [v.grad for v in g["x"]],
            },
            "changed": ["dW1", "db1", "dx"],
        },
        {
            "index": 12, "phase": "update", "op": "sgd", "layer": 0,
            "formula": "W = W − η·∂L/∂W",
            "narrative": {"ru": "SGD: каждый вес шагает против своего градиента (η = 0.5). Показан один вес явно, остальные обновляются той же формулой."},
            "inputs": [
                tensor("W2[0,0]", [g["w2"][0][0].data], seed_note),
                tensor("∂L/∂W2[0,0]", [dw2[0]], "шаг 10 (matvec-grad)"),
                tensor("η", [LR], "гиперпараметр SGD"),
            ],
            "outputs": tensor("W2[0,0]", [g["w2"][0][0].data, w2_00_after]),
            "grads": None,
            "changed": ["W"],
        },
        {
            "index": 13, "phase": "summary", "op": "", "layer": 0,
            "formula": "L: до -> после",
            "narrative": {"ru": "Один полный цикл на одном сэмпле завершён: L уменьшился. Дальше — такие же шаги по остальным примерам XOR, по каждому градиенту своих весов."},
            "inputs": [
                tensor("L", [loss], "шаг 7 (bce)"),
                tensor("L′", [updated["loss"]], "пересчёт forward после шага 13 (update)"),
            ],
            "outputs": tensor("L", [loss, updated["loss"]]),
            "grads": None, "changed": [],
        },
    ]
    return steps


def apply_sgd(w1, b1, w2, b2, g):
    """W = W − η·∂L/∂W по всем параметрам + пересчёт loss после обновления."""
    lr = LR
    u_w1 = [[g["w1"][j][i].data - lr * g["w1"][j][i].grad for i in range(2)] for j in range(3)]
    u_b1 = [g["b1"][j].data - lr * g["b1"][j].grad for j in range(3)]
    u_w2 = [[g["w2"][0][j].data - lr * g["w2"][0][j].grad for j in range(3)]]
    u_b2 = [g["b2"][0].data - lr * g["b2"][0].grad]
    loss_after = forward_numeric(u_w1, u_b1, u_w2, u_b2, X, Y)["loss"]
    return {"w1": u_w1, "b1": u_b1, "w2": u_w2, "b2": u_b2, "loss": loss_after}


def main():
    seed, w1, b1, w2, b2, g = find_seed()
    max_rel = gradcheck(w1, b1, w2, b2, g)
    updated = apply_sgd(w1, b1, w2, b2, g)

    all_grads = [v.grad for row in g["w1"] for v in row]
    all_grads += [v.grad for v in g["b1"]]
    all_grads += [v.grad for v in g["w2"][0]]
    all_grads.append(g["b2"][0].grad)
    grad_norm = math.sqrt(sum(gr * gr for gr in all_grads))

    doc = {
        "schemaVersion": 1,
        "scenario": "xor-prototype",
        "seed": seed,
        "generatedBy": "tools/reference/gen_mock_trace.py (micrograd-semantics, stdlib-only)",
        "network": {"layers": [2, 3, 1], "hidden": "tanh", "output": "sigmoid", "loss": "bce", "lr": LR},
        "sample": {"x": [int(X[0]), int(X[1])], "y": Y},
        "weights": {
            "w1": [[c.data for c in row] for row in g["w1"]],
            "b1": [v.data for v in g["b1"]],
            "w2": [[c.data for c in row] for row in g["w2"]],
            "b2": [v.data for v in g["b2"]],
        },
        "steps": build_steps(seed, w1, b1, w2, b2, g, updated),
        "final": {
            "lossBefore": g["loss"].data,
            "lossAfter": updated["loss"],
            "gradNorm": grad_norm,
        },
        "gradCheck": {"method": "central-difference", "maxRelErr": max_rel},
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        # indent: каждый шаг («index») на своей строке — план 01-01 требует
        # `grep -c '"index"' src/data/xor-trace.json` → 14; вывод детерминирован.
        json.dump(doc, f, ensure_ascii=False, indent=2)
    sys.stdout.write(
        "ok: %s (seed %d, %d steps, gradCheck maxRelErr %r, L %r -> %r)\n"
        % (OUT_PATH, seed, len(doc["steps"]), max_rel, doc["final"]["lossBefore"], doc["final"]["lossAfter"])
    )


if __name__ == "__main__":
    main()
