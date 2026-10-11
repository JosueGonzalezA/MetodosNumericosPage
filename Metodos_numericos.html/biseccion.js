class ExpressionParser {
            constructor(source) {
                this.source = source;
                this.position = 0;
                this.current = null;
                this.advance();
            }

            advance() {
                while (/\s/.test(this.source[this.position] || "")) {
                    this.position += 1;
                }

                if (this.position >= this.source.length) {
                    this.current = { type: "end" };
                    return;
                }

                const rest = this.source.slice(this.position);
                const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
                if (number) {
                    this.current = { type: "number", value: Number(number[0]) };
                    this.position += number[0].length;
                    return;
                }

                const identifier = /^[a-zA-Z][a-zA-Z0-9]*/.exec(rest);
                if (identifier) {
                    this.current = { type: "identifier", value: identifier[0].toLowerCase() };
                    this.position += identifier[0].length;
                    return;
                }

                const character = this.source[this.position];
                if ("+-*/^()".includes(character)) {
                    this.current = { type: character };
                } else {
                    throw new Error(
                        `Símbolo no permitido en la posición ${this.position + 1}.`
                    );
                }
                this.position += 1;
            }

            parse() {
                const expression = this.parseExpression();
                if (this.current.type !== "end") {
                    throw new Error("La función contiene texto o símbolos inesperados.");
                }
                return expression;
            }

            parseExpression() {
                let node = this.parseTerm();
                while (this.current.type === "+" || this.current.type === "-") {
                    const operator = this.current.type;
                    this.advance();
                    node = { type: "binary", operator, left: node, right: this.parseTerm() };
                }
                return node;
            }

            parseTerm() {
                let node = this.parseUnary();
                while (this.current.type === "*" || this.current.type === "/") {
                    const operator = this.current.type;
                    this.advance();
                    node = { type: "binary", operator, left: node, right: this.parseUnary() };
                }
                return node;
            }

            parseUnary() {
                if (this.current.type === "+" || this.current.type === "-") {
                    const operator = this.current.type;
                    this.advance();
                    return { type: "unary", operator, value: this.parseUnary() };
                }
                return this.parsePower();
            }

            parsePower() {
                let node = this.parsePrimary();
                if (this.current.type === "^") {
                    this.advance();
                    node = {
                        type: "binary",
                        operator: "^",
                        left: node,
                        right: this.parseUnary()
                    };
                }
                return node;
            }

            parsePrimary() {
                if (this.current.type === "number") {
                    const node = { type: "number", value: this.current.value };
                    this.advance();
                    return node;
                }
                if (this.current.type === "identifier") {
                    const name = this.current.value;
                    this.advance();

                    if (name === "x") return { type: "x" };
                    if (name === "pi" || name === "e") {
                        return { type: "constant", name };
                    }
                    if (isSupportedFunction(name)) {
                        if (this.current.type !== "(") {
                            throw new Error(
                                `La función ${name} debe escribirse con paréntesis, por ejemplo ${name}(x).`
                            );
                        }
                        this.advance();
                        const argument = this.parseExpression();
                        if (this.current.type !== ")") {
                            throw new Error("Falta un paréntesis de cierre en la función.");
                        }
                        this.advance();
                        return { type: "function", name, argument };
                    }
                    throw new Error(
                        `El nombre "${name}" no está permitido. Usa solo x, pi, e y las funciones indicadas.`
                    );
                }
                if (this.current.type === "(") {
                    this.advance();
                    const node = this.parseExpression();
                    if (this.current.type !== ")") {
                        throw new Error("Falta un paréntesis de cierre.");
                    }
                    this.advance();
                    return node;
                }
                throw new Error("Se esperaba un número, x, una función permitida o un paréntesis de apertura.");
            }
        }

        const supportedFunctions = new Set([
            "sin", "cos", "tan", "asin", "acos", "atan",
            "exp", "log", "log10", "sqrt", "abs"
        ]);

        function isSupportedFunction(name) {
            return supportedFunctions.has(name);
        }

        function evaluateExpression(node, x) {
            if (node.type === "number") {
                if (!Number.isFinite(node.value)) {
                    throw invalidEvaluationError(x, node.value);
                }
                return node.value;
            }
            if (node.type === "x") return x;
            if (node.type === "constant") {
                return node.name === "pi" ? Math.PI : Math.E;
            }
            let value;
            if (node.type === "unary") {
                const operand = evaluateExpression(node.value, x);
                value = node.operator === "-" ? -operand : operand;
            } else if (node.type === "function") {
                const argument = evaluateExpression(node.argument, x);
                switch (node.name) {
                    case "sin": value = Math.sin(argument); break;
                    case "cos": value = Math.cos(argument); break;
                    case "tan": value = Math.tan(argument); break;
                    case "asin": value = Math.asin(argument); break;
                    case "acos": value = Math.acos(argument); break;
                    case "atan": value = Math.atan(argument); break;
                    case "exp": value = Math.exp(argument); break;
                    case "log": value = Math.log(argument); break;
                    case "log10": value = Math.log10(argument); break;
                    case "sqrt": value = Math.sqrt(argument); break;
                    case "abs": value = Math.abs(argument); break;
                    default: throw new Error("Función matemática no reconocida.");
                }
            } else {
                const left = evaluateExpression(node.left, x);
                const right = evaluateExpression(node.right, x);
                switch (node.operator) {
                    case "+": value = left + right; break;
                    case "-": value = left - right; break;
                    case "*": value = left * right; break;
                    case "/": value = left / right; break;
                    case "^": value = left ** right; break;
                    default: throw new Error("Operación matemática no reconocida.");
                }
            }

            if (!Number.isFinite(value)) {
                throw invalidEvaluationError(x, value);
            }
            return value;
        }

        function invalidEvaluationError(x, value) {
            const detail = Number.isNaN(value)
                ? "La operación no produjo un número real; puede estar fuera del dominio real o producir un resultado complejo."
                : "La operación produjo un valor infinito.";
            return new Error(
                `${detail} al evaluar x = ${formatNumber(x)}. Revisa la expresión y su dominio en el intervalo.`
            );
        }

        function formatNumber(value) {
            return String(value);
        }

        function midpoint(a, b) {
            const difference = b - a;
            return Number.isFinite(difference) ? a + difference / 2 : a / 2 + b / 2;
        }

        function halfWidth(a, b) {
            return b / 2 - a / 2;
        }

        const bisectionForm = document.getElementById("bisection-form");
        const errorOutput = document.getElementById("bisection-error");
        const resultsOutput = document.getElementById("bisection-results");
        const exampleSelect = document.getElementById("bisection-example");

        exampleSelect.addEventListener("change", () => {
            const selectedExample = exampleSelect.selectedOptions[0];
            if (!selectedExample.value) return;

            document.getElementById("bisection-function").value =
                selectedExample.dataset.function;
            document.getElementById("bisection-a").value = selectedExample.dataset.a;
            document.getElementById("bisection-b").value = selectedExample.dataset.b;
        });

        bisectionForm.addEventListener("submit", (event) => {
            event.preventDefault();
            errorOutput.hidden = true;
            errorOutput.textContent = "";
            resultsOutput.hidden = true;
            resultsOutput.replaceChildren();

            try {
                const source = document.getElementById("bisection-function").value.trim();
                const aInput = document.getElementById("bisection-a").valueAsNumber;
                const bInput = document.getElementById("bisection-b").valueAsNumber;
                const tolerance = document.getElementById("bisection-tolerance").valueAsNumber;
                const maxIterations =
                    document.getElementById("bisection-max-iterations").valueAsNumber;

                if (!source) throw new Error("Escribe una función f(x).");
                if (![aInput, bInput, tolerance, maxIterations].every(Number.isFinite)) {
                    throw new Error("Todos los campos numéricos deben contener números finitos.");
                }
                if (aInput >= bInput) {
                    throw new Error("El extremo inferior a debe ser menor que el extremo superior b.");
                }
                if (tolerance <= 0) {
                    throw new Error("La tolerancia absoluta debe ser mayor que cero.");
                }
                if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 1000) {
                    throw new Error("El máximo de iteraciones debe ser un entero entre 1 y 1000.");
                }

                const expression = new ExpressionParser(source).parse();
                const evaluate = (x) => {
                    return evaluateExpression(expression, x);
                };

                let a = aInput;
                let b = bInput;
                let fa = evaluate(a);
                let fb = evaluate(b);

                if (fa === 0) {
                    renderResult(a, 0, 0, "f(a) es cero: el extremo inferior es una raíz.", []);
                    return;
                }
                if (fb === 0) {
                    renderResult(b, 0, 0, "f(b) es cero: el extremo superior es una raíz.", []);
                    return;
                }
                if (Math.sign(fa) === Math.sign(fb)) {
                    throw new Error(
                        "f(a) y f(b) tienen el mismo signo; el intervalo no tiene cambio de signo."
                    );
                }

                const rows = [];
                let root = null;
                let errorBound = null;
                let reason = "";

                for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
                    const currentHalfWidth = halfWidth(a, b);
                    const middle = midpoint(a, b);
                    const fMiddle = evaluate(middle);
                    rows.push({
                        iteration,
                        a,
                        b,
                        middle,
                        fMiddle,
                        halfWidth: currentHalfWidth
                    });
                    root = middle;
                    errorBound = currentHalfWidth;

                    if (fMiddle === 0) {
                        errorBound = 0;
                        reason = "f(punto medio) es cero: se encontró una raíz exacta.";
                        break;
                    }
                    if (currentHalfWidth <= tolerance) {
                        reason = "La mitad del ancho del intervalo es menor o igual que la tolerancia.";
                        break;
                    }
                    if (middle === a || middle === b) {
                        reason = "La precisión numérica impide obtener un punto medio distinto de los extremos.";
                        break;
                    }

                    if (Math.sign(fa) !== Math.sign(fMiddle)) {
                        b = middle;
                        fb = fMiddle;
                    } else {
                        a = middle;
                        fa = fMiddle;
                    }

                    if (iteration === maxIterations) {
                        reason = "Se alcanzó el máximo de iteraciones.";
                    }
                }

                renderResult(root, errorBound, rows.length, reason, rows);
            } catch (error) {
                errorOutput.textContent = error.message;
                errorOutput.hidden = false;
            }
        });

        function renderResult(root, errorBound, iterations, reason, rows) {
            const summary = document.createElement("div");
            const heading = document.createElement("h4");
            heading.textContent = "Resultado";
            summary.append(heading);

            const rootLine = document.createElement("p");
            rootLine.textContent = `Raíz aproximada: x = ${formatNumber(root)}`;
            summary.append(rootLine);

            const errorLine = document.createElement("p");
            errorLine.textContent = `Cota del error: ${formatNumber(errorBound)}`;
            summary.append(errorLine);

            const iterationsLine = document.createElement("p");
            iterationsLine.textContent = `Iteraciones realizadas: ${iterations}`;
            summary.append(iterationsLine);

            const reasonLine = document.createElement("p");
            reasonLine.textContent = `Motivo de término: ${reason}`;
            summary.append(reasonLine);

            if (rows.length > 0) {
                const scroll = document.createElement("div");
                scroll.className = "table-scroll";
                const table = document.createElement("table");
                table.className = "bisection-table";
                const caption = document.createElement("caption");
                caption.textContent = "Historial de iteraciones";
                table.append(caption);

                const headings = ["Iteración", "a", "b", "Punto medio", "f(punto medio)",
                    "Mitad del ancho"];
                const thead = document.createElement("thead");
                const headerRow = document.createElement("tr");
                headings.forEach((text) => {
                    const th = document.createElement("th");
                    th.scope = "col";
                    th.textContent = text;
                    headerRow.append(th);
                });
                thead.append(headerRow);
                table.append(thead);

                const tbody = document.createElement("tbody");
                rows.forEach((row) => {
                    const tr = document.createElement("tr");
                    [
                        row.iteration,
                        formatNumber(row.a),
                        formatNumber(row.b),
                        formatNumber(row.middle),
                        formatNumber(row.fMiddle),
                        formatNumber(row.halfWidth)
                    ].forEach((value) => {
                        const td = document.createElement("td");
                        td.textContent = value;
                        tr.append(td);
                    });
                    tbody.append(tr);
                });
                table.append(tbody);
                scroll.append(table);
                summary.append(scroll);
            }

            resultsOutput.append(summary);
            resultsOutput.hidden = false;
        }
