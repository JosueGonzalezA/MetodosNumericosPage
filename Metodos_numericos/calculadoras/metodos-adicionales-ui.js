"use strict";

if (typeof document !== "undefined") {
  const metodos = globalThis.METODOS_ADICIONALES;

  function numero(valor) {
    return Number(Number(valor).toPrecision(10)).toString();
  }

  function esDecimal(texto) {
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(texto.trim());
  }

  function leer(formulario, nombre, opcional = false) {
    const campo = formulario.elements.namedItem(nombre);
    if (!campo || !campo.value.trim()) {
      if (opcional) return null;
      throw new Error(`Falta el campo ${nombre}.`);
    }
    if (!esDecimal(campo.value)) throw new Error(`El campo ${nombre} debe ser un número decimal finito.`);
    const valor = Number(campo.value);
    if (!Number.isFinite(valor)) throw new Error(`El campo ${nombre} debe ser un número decimal finito.`);
    return valor;
  }

  function texto(contenedor, contenido, etiqueta = "p") {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = contenido;
    contenedor.append(elemento);
    return elemento;
  }

  function tabla(contenedor, columnas, filas) {
    const elemento = document.createElement("table");
    const cabeza = document.createElement("thead");
    const filaCabeza = document.createElement("tr");
    columnas.forEach(columna => {
      const celda = document.createElement("th");
      celda.scope = "col";
      celda.textContent = columna;
      filaCabeza.append(celda);
    });
    cabeza.append(filaCabeza);
    elemento.append(cabeza);
    const cuerpo = document.createElement("tbody");
    filas.forEach(valores => {
      const fila = document.createElement("tr");
      valores.forEach(valor => {
        const celda = document.createElement("td");
        celda.textContent = String(valor);
        fila.append(celda);
      });
      cuerpo.append(fila);
    });
    elemento.append(cuerpo);
    contenedor.append(elemento);
  }

  function conectar(idFormulario, idResultado, calcular, mostrar) {
    const formulario = document.getElementById(idFormulario);
    const salida = document.getElementById(idResultado);
    formulario.addEventListener("submit", evento => {
      evento.preventDefault();
      salida.replaceChildren();
      try {
        const datos = calcular(formulario);
        mostrar(salida, datos);
      } catch (error) {
        texto(salida, `Error: ${error.message}`);
      }
    });
  }

  function expresionPolinomial(coeficientes) {
    const partes = [];
    for (let grado = coeficientes.length - 1; grado >= 0; grado--) {
      const coeficiente = coeficientes[grado];
      if (coeficiente === 0) continue;
      const magnitud = Math.abs(coeficiente);
      const parteVariable = grado === 0 ? "" : grado === 1 ? "x" : `x^${grado}`;
      const parteNumero = parteVariable && Math.abs(magnitud - 1) < 1e-9 ? "" : numero(magnitud);
      const parte = `${parteNumero}${parteVariable}`;
      partes.push(`${partes.length ? (coeficiente < 0 ? " − " : " + ") : (coeficiente < 0 ? "−" : "")}${parte}`);
    }
    return partes.join("") || "0";
  }

  function dibujarGrafica(puntos, xEvaluar, yEvaluar, evaluar) {
    const svg = "http://www.w3.org/2000/svg";
    const crear = (etiqueta, atributos = {}, contenido = "") => {
      const elemento = document.createElementNS(svg, etiqueta);
      Object.entries(atributos).forEach(([nombre, valor]) => elemento.setAttribute(nombre, String(valor)));
      if (contenido) elemento.textContent = contenido;
      return elemento;
    };
    const ancho = 640, alto = 350;
    const izquierda = 58, derecha = 620, arriba = 22, abajo = 302;
    const valoresX = puntos.map(punto => punto.x);
    if (xEvaluar !== null) valoresX.push(xEvaluar);
    const minimoX = Math.min(...valoresX), maximoX = Math.max(...valoresX);
    const margenX = Math.max((maximoX - minimoX) * 0.1, 0.1);
    const xMin = minimoX - margenX, xMax = maximoX + margenX;
    const valoresY = puntos.map(punto => punto.y);
    if (yEvaluar !== null) valoresY.push(yEvaluar);
    for (let indice = 0; indice <= 180; indice++) {
      const valor = evaluar(xMin + (xMax - xMin) * indice / 180);
      if (Number.isFinite(valor)) valoresY.push(valor);
    }
    const minimoY = Math.min(...valoresY), maximoY = Math.max(...valoresY);
    const margenY = Math.max((maximoY - minimoY) * 0.12, 0.1);
    const yMin = minimoY - margenY, yMax = maximoY + margenY;
    const pixelX = valor => izquierda + (valor - xMin) / (xMax - xMin) * (derecha - izquierda);
    const pixelY = valor => abajo - (valor - yMin) / (yMax - yMin) * (abajo - arriba);
    const grafica = crear("svg", {
      viewBox: `0 0 ${ancho} ${alto}`, role: "img",
      "aria-label": xEvaluar === null ? "Gráfica del polinomio con cuadrícula y puntos conocidos" : "Gráfica del polinomio con cuadrícula, puntos conocidos y valor interpolado",
      class: "grafica-interpolacion"
    });
    grafica.append(crear("rect", { x: 0, y: 0, width: ancho, height: alto, fill: "#fff" }));
    for (let indice = 0; indice <= 6; indice++) {
      const valor = xMin + (xMax - xMin) * indice / 6;
      const x = pixelX(valor);
      grafica.append(crear("line", { x1: x, y1: arriba, x2: x, y2: abajo, stroke: "#dce3e9" }));
      grafica.append(crear("text", { x, y: abajo + 19, "text-anchor": "middle", fill: "#263447", "font-size": 11 }, numero(valor)));
    }
    for (let indice = 0; indice <= 5; indice++) {
      const valor = yMin + (yMax - yMin) * indice / 5;
      const y = pixelY(valor);
      grafica.append(crear("line", { x1: izquierda, y1: y, x2: derecha, y2: y, stroke: "#dce3e9" }));
      grafica.append(crear("text", { x: izquierda - 7, y: y + 4, "text-anchor": "end", fill: "#263447", "font-size": 11 }, numero(valor)));
    }
    if (xMin <= 0 && xMax >= 0) grafica.append(crear("line", { x1: pixelX(0), y1: arriba, x2: pixelX(0), y2: abajo, stroke: "#6a7889" }));
    if (yMin <= 0 && yMax >= 0) grafica.append(crear("line", { x1: izquierda, y1: pixelY(0), x2: derecha, y2: pixelY(0), stroke: "#6a7889" }));
    let ruta = "";
    for (let indice = 0; indice <= 180; indice++) {
      const x = xMin + (xMax - xMin) * indice / 180;
      const y = evaluar(x);
      if (!Number.isFinite(y)) continue;
      ruta += `${ruta ? "L" : "M"}${numero(pixelX(x))},${numero(pixelY(y))} `;
    }
    grafica.append(crear("path", { d: ruta, fill: "none", stroke: "#14538a", "stroke-width": 2.5 }));
    puntos.forEach((punto, indice) => {
      grafica.append(crear("circle", { cx: pixelX(punto.x), cy: pixelY(punto.y), r: 4, fill: "#1f2b3b" }));
      grafica.append(crear("text", { x: pixelX(punto.x) + 7, y: pixelY(punto.y) - 7, fill: "#263447", "font-size": 11 }, `P${indice}`));
    });
    if (xEvaluar !== null && yEvaluar !== null) {
      grafica.append(crear("circle", { cx: pixelX(xEvaluar), cy: pixelY(yEvaluar), r: 6, fill: "#b99050", stroke: "#1f2b3b" }));
    }
    grafica.append(crear("text", { x: derecha - 3, y: abajo - 8, "text-anchor": "end", fill: "#263447", "font-size": 12 }, "x"));
    grafica.append(crear("text", { x: izquierda + 7, y: arriba + 14, fill: "#263447", "font-size": 12 }, "f(x)"));
    return grafica;
  }

  const formularioTaylor = document.getElementById("form-taylor");
  const campoObjetivoTaylor = formularioTaylor.elements.namedItem("objetivo");
  const campoPasoTaylor = formularioTaylor.elements.namedItem("paso");
  const campoCentroTaylor = formularioTaylor.elements.namedItem("centro");
  function actualizarPasoTaylor() {
    if (!campoObjetivoTaylor || !campoObjetivoTaylor.value.trim()) return;
    if (!esDecimal(campoObjetivoTaylor.value) || (campoCentroTaylor.value.trim() && !esDecimal(campoCentroTaylor.value))) return;
    const centro = campoCentroTaylor && campoCentroTaylor.value.trim() ? Number(campoCentroTaylor.value) : 0;
    const objetivo = Number(campoObjetivoTaylor.value);
    if (Number.isFinite(centro) && Number.isFinite(objetivo)) campoPasoTaylor.value = String(objetivo - centro);
  }
  if (campoObjetivoTaylor) {
    campoObjetivoTaylor.addEventListener("input", actualizarPasoTaylor);
    campoCentroTaylor.addEventListener("input", actualizarPasoTaylor);
    campoPasoTaylor.addEventListener("input", () => { campoObjetivoTaylor.value = ""; });
  }

  conectar("form-taylor", "resultado-taylor", formulario => {
    const centroIngresado = leer(formulario, "centro", true);
    const centro = centroIngresado ?? 0;
    const objetivo = leer(formulario, "objetivo", true);
    const pasoIngresado = leer(formulario, "paso", true);
    if (objetivo === null && pasoIngresado === null) throw new Error("Escribe el paso h o el valor final de x.");
    const paso = objetivo === null ? pasoIngresado : objetivo - centro;
    const tolerancia = leer(formulario, "tolerancia", true);
    if (tolerancia !== null && tolerancia <= 0) throw new Error("La tolerancia debe ser mayor que cero.");
    const ordenIngresado = leer(formulario, "orden", true);
    const ordenMaximo = ordenIngresado ?? (tolerancia === null ? 3 : 8);
    if (!Number.isInteger(ordenMaximo) || ordenMaximo < 0 || ordenMaximo > 8) throw new Error("El orden de Taylor debe ser un entero de 0 a 8.");
    const funcion = formulario.elements.namedItem("funcion").value;
    let resultado;
    if (tolerancia === null) {
      resultado = metodos.resolverTaylor(funcion, centro, paso, ordenMaximo);
    } else {
      for (let orden = 0; orden <= ordenMaximo; orden++) {
        resultado = metodos.resolverTaylor(funcion, centro, paso, orden);
        if (resultado.filas.at(-1).errorAbsoluto <= tolerancia) break;
      }
    }
    const toleranciaAlcanzada = tolerancia === null || resultado.filas.at(-1).errorAbsoluto <= tolerancia;
    return { ...resultado, centro, paso, objetivo, tolerancia, ordenMaximo, centroAutomatico: centroIngresado === null, ordenAutomatico: tolerancia === null && ordenIngresado === null, toleranciaAlcanzada };
  }, (salida, datos) => {
    texto(salida, `Desde x₀ = ${numero(datos.centro)} hasta x = ${numero(datos.punto)}; h = ${numero(datos.paso)}.`);
    if (datos.centroAutomatico) texto(salida, "Se usó x₀ = 0 porque quedó vacío.");
    if (datos.ordenAutomatico) texto(salida, "Se usó orden máximo 3 porque quedó vacío.");
    if (datos.tolerancia !== null) texto(salida, `Orden automático con tolerancia absoluta ${numero(datos.tolerancia)}: ${datos.toleranciaAlcanzada ? `se alcanzó en el orden ${datos.filas.at(-1).orden}` : `no se alcanzó hasta el orden ${datos.ordenMaximo}`}.`);
    texto(salida, `Valor de la función en x: ${numero(datos.valorExacto)}.`);
    tabla(salida, ["Orden n", "f⁽ⁿ⁾(x)", "f⁽ⁿ⁾(x₀)", "Término", "Aproximación", "Error absoluto"], datos.filas.map(fila => [
      fila.orden, fila.derivada, numero(fila.valorDerivada), numero(fila.termino),
      numero(fila.aproximacion), numero(fila.errorAbsoluto)
    ]));
    texto(salida, `P${datos.filas.at(-1).orden}(${numero(datos.punto)}) ≈ ${numero(datos.filas.at(-1).aproximacion)}.`, "h3");
  });

  conectar("form-lagrange-lineal", "resultado-lagrange-lineal", formulario => {
    const x0 = leer(formulario, "x0"), y0 = leer(formulario, "y0");
    const x1 = leer(formulario, "x1"), y1 = leer(formulario, "y1");
    const x = leer(formulario, "valor", true);
    return { ...metodos.resolverLagrangeLineal(x0, y0, x1, y1, x), x0, y0, x1, y1, x };
  }, (salida, datos) => {
    tabla(salida, ["Punto", "x", "y"], [["0", numero(datos.x0), numero(datos.y0)], ["1", numero(datos.x1), numero(datos.y1)]]);
    if (datos.x === null) {
      texto(salida, `P₁(x) = ${numero(datos.y0)}(x − ${numero(datos.x1)}) / (${numero(datos.x0)} − ${numero(datos.x1)}) + ${numero(datos.y1)}(x − ${numero(datos.x0)}) / (${numero(datos.x1)} − ${numero(datos.x0)}).`, "h3");
      salida.append(dibujarGrafica([{ x: datos.x0, y: datos.y0 }, { x: datos.x1, y: datos.y1 }], null, null,
        valor => datos.y0 + datos.pendiente * (valor - datos.x0)));
      return;
    }
    texto(salida, `L₀(${numero(datos.x)}) = (${numero(datos.x)} − ${numero(datos.x1)}) / (${numero(datos.x0)} − ${numero(datos.x1)}) = ${numero(datos.base0)}.`);
    texto(salida, `L₁(${numero(datos.x)}) = (${numero(datos.x)} − ${numero(datos.x0)}) / (${numero(datos.x1)} − ${numero(datos.x0)}) = ${numero(datos.base1)}.`);
    texto(salida, `P₁(${numero(datos.x)}) = ${numero(datos.y0)} · ${numero(datos.base0)} + ${numero(datos.y1)} · ${numero(datos.base1)} = ${numero(datos.resultado)}.`, "h3");
    if (datos.x < Math.min(datos.x0, datos.x1) || datos.x > Math.max(datos.x0, datos.x1)) texto(salida, "El valor de x está fuera del intervalo de los puntos; el resultado es una extrapolación.");
    salida.append(dibujarGrafica([{ x: datos.x0, y: datos.y0 }, { x: datos.x1, y: datos.y1 }], datos.x, datos.resultado,
      valor => datos.y0 + datos.pendiente * (valor - datos.x0)));
  });

  const formularioSimpson = document.getElementById("form-simpson");
  const valorExactoSimpson = formularioSimpson.elements.namedItem("exacto");
  let exactoDelEjemplo = true;
  valorExactoSimpson.addEventListener("input", () => { exactoDelEjemplo = false; });
  for (const nombre of ["funcion", "a", "b"]) {
    formularioSimpson.elements.namedItem(nombre).addEventListener("input", () => {
      if (exactoDelEjemplo) {
        valorExactoSimpson.value = "";
        exactoDelEjemplo = false;
      }
    });
  }

  conectar("form-simpson", "resultado-simpson", formulario => {
    const a = leer(formulario, "a"), b = leer(formulario, "b");
    const nIngresado = leer(formulario, "n", true);
    const tolerancia = leer(formulario, "tolerancia", true);
    const exacto = leer(formulario, "exacto", true);
    const funcion = formulario.elements.namedItem("funcion").value;
    if (tolerancia !== null) {
      const nInicial = nIngresado ?? 2;
      const resultado = metodos.resolverSimpsonAutomatico(funcion, a, b, tolerancia, exacto, nInicial);
      return { ...resultado, a, b, tolerancia, nInicial, nAutomatico: true, nPredeterminado: false };
    }
    const n = nIngresado ?? 4;
    return { ...metodos.resolverSimpson(funcion, a, b, n, exacto), a, b, n, tolerancia: null, nAutomatico: false, nPredeterminado: nIngresado === null };
  }, (salida, datos) => {
    if (datos.nPredeterminado) texto(salida, "Se usaron 4 subintervalos porque n quedó vacío.");
    if (datos.nAutomatico) {
      texto(salida, `Se eligieron ${datos.n} subintervalos pares, empezando en n = ${datos.nInicial}, con tolerancia absoluta ${numero(datos.tolerancia)}.`);
      tabla(salida, ["n", "Integral aproximada", "Error estimado", "Verificación adicional"], datos.historial.map(fila => [
        fila.n, numero(fila.resultado), fila.errorEstimado === null ? "—" : numero(fila.errorEstimado),
        fila.discrepanciaAlterna === null ? "—" : numero(fila.discrepanciaAlterna)
      ]));
      texto(salida, datos.convergio
        ? `La estimación de error por refinamiento fue ${numero(datos.errorEstimado)} (orientativa).`
        : `No se alcanzó la tolerancia hasta n = ${datos.n}. La estimación de error fue ${numero(datos.errorEstimado)} (orientativa).`);
      const ultimaFila = datos.historial.at(-1);
      if (ultimaFila.discrepanciaAlterna !== null) texto(salida, `La mayor diferencia al comprobar otras mallas fue ${numero(ultimaFila.discrepanciaAlterna)}.`);
    }
    texto(salida, `h = (b − a) / n = (${numero(datos.b)} − ${numero(datos.a)}) / ${datos.n} = ${numero(datos.paso)}.`);
    tabla(salida, ["i", "xᵢ", "f(xᵢ)", "Coeficiente", "Producto"], datos.filas.map(fila => [
      fila.indice, numero(fila.x), numero(fila.valor), fila.coeficiente, numero(fila.producto)
    ]));
    texto(salida, `I ≈ h/3 × suma = ${numero(datos.paso)}/3 × ${numero(datos.suma)} = ${numero(datos.resultado)}.`, "h3");
    if (datos.valorExacto !== null) {
      texto(salida, `Valor exacto proporcionado: ${numero(datos.valorExacto)}. Error absoluto: ${numero(datos.errorAbsoluto)}.`);
      if (datos.errorPorcentual !== null) texto(salida, `Error porcentual: ${numero(datos.errorPorcentual)}%.`);
    }
  });

  conectar("form-interpolacion-lineal", "resultado-interpolacion-lineal", formulario => {
    const x0 = leer(formulario, "x0"), y0 = leer(formulario, "y0");
    const x1 = leer(formulario, "x1"), y1 = leer(formulario, "y1");
    const x = leer(formulario, "x", true), y = leer(formulario, "y", true);
    if (x === null && y === null) throw new Error("Escribe un valor de x o de y para estimar.");
    return { ...metodos.resolverInterpolacionLineal(x0, y0, x1, y1, x, y), x0, y0, x1, y1, x, y };
  }, (salida, datos) => {
    tabla(salida, ["Punto", "x", "y"], [["0", numero(datos.x0), numero(datos.y0)], ["1", numero(datos.x1), numero(datos.y1)]]);
    texto(salida, `Pendiente = (y₁ − y₀) / (x₁ − x₀) = (${numero(datos.y1)} − ${numero(datos.y0)}) / (${numero(datos.x1)} − ${numero(datos.x0)}) = ${numero(datos.pendiente)}.`);
    texto(salida, `P(x) = ${numero(datos.y0)} + ${numero(datos.pendiente)}(x − ${numero(datos.x0)}).`);
    if (datos.x !== null) texto(salida, `P(${numero(datos.x)}) = ${numero(datos.resultadoY)}.`, "h3");
    if (datos.y !== null) {
      if (datos.errorInverso) texto(salida, datos.errorInverso);
      else texto(salida, `Para y = ${numero(datos.y)}: x = ${numero(datos.x0)} + (${numero(datos.y)} − ${numero(datos.y0)}) / ${numero(datos.pendiente)} = ${numero(datos.resultadoX)}.`, "h3");
    }
    const minimo = Math.min(datos.x0, datos.x1);
    const maximo = Math.max(datos.x0, datos.x1);
    if ((datos.x !== null && (datos.x < minimo || datos.x > maximo)) ||
        (datos.resultadoX !== null && (datos.resultadoX < minimo || datos.resultadoX > maximo))) {
      texto(salida, "Uno de los valores estimados está fuera del intervalo de los puntos; ese resultado es una extrapolación.");
    }
    const xMarcado = datos.x !== null ? datos.x : datos.resultadoX;
    const yMarcado = datos.x !== null ? datos.resultadoY : datos.y;
    salida.append(dibujarGrafica([{ x: datos.x0, y: datos.y0 }, { x: datos.x1, y: datos.y1 }], xMarcado, yMarcado,
      valor => datos.y0 + datos.pendiente * (valor - datos.x0)));
  });

  const contenedorPuntos = document.getElementById("puntos-polinomiales");
  function renumerarPuntos() {
    contenedorPuntos.querySelectorAll("[data-punto]").forEach((fila, indice) => {
      const etiqueta = fila.querySelector(".etiqueta-punto");
      if (etiqueta) etiqueta.textContent = `Punto ${indice + 1}`;
      const campos = fila.querySelectorAll("input");
      if (campos[0]) campos[0].setAttribute("aria-label", `x del punto ${indice + 1}`);
      if (campos[1]) campos[1].setAttribute("aria-label", `y del punto ${indice + 1}`);
    });
  }
  document.getElementById("agregar-punto").addEventListener("click", () => {
    if (contenedorPuntos.querySelectorAll("[data-punto]").length >= 10) return;
    const fila = document.createElement("div");
    fila.className = "fila-punto";
    fila.setAttribute("data-punto", "");
    const titulo = document.createElement("strong");
    titulo.className = "etiqueta-punto";
    fila.append(titulo);
    for (const coordenada of ["x", "y"]) {
      const etiqueta = document.createElement("label");
      etiqueta.textContent = `${coordenada}: `;
      const campo = document.createElement("input");
      campo.type = "text";
      campo.inputMode = "decimal";
      campo.required = true;
      campo.setAttribute(`data-${coordenada}`, "");
      etiqueta.append(campo);
      fila.append(etiqueta);
    }
    contenedorPuntos.append(fila);
    renumerarPuntos();
    fila.querySelector("input").focus();
  });
  document.getElementById("quitar-punto").addEventListener("click", () => {
    const filas = contenedorPuntos.querySelectorAll("[data-punto]");
    if (filas.length > 2) filas[filas.length - 1].remove();
    renumerarPuntos();
  });
  renumerarPuntos();

  conectar("form-interpolacion-polinomial", "resultado-interpolacion-polinomial", formulario => {
    const puntos = [...contenedorPuntos.querySelectorAll("[data-punto]")].map((fila, indice) => {
      const entradaX = fila.querySelector("[data-x]");
      const entradaY = fila.querySelector("[data-y]");
      if (!entradaX.value.trim() || !entradaY.value.trim()) throw new Error(`Completa el punto ${indice + 1}.`);
      if (!esDecimal(entradaX.value) || !esDecimal(entradaY.value)) throw new Error(`El punto ${indice + 1} debe tener números decimales finitos.`);
      const x = Number(entradaX.value), y = Number(entradaY.value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`El punto ${indice + 1} debe tener números finitos.`);
      return { x, y };
    });
    const x = leer(formulario, "valor", true);
    return { ...metodos.resolverPolinomial(puntos, x), puntos, x };
  }, (salida, datos) => {
    if (datos.x === null) {
      tabla(salida, ["i", "xᵢ", "yᵢ"], datos.filas.map(fila => [fila.indice, numero(fila.x), numero(fila.y)]));
    } else {
      tabla(salida, ["i", "xᵢ", "yᵢ", "Lᵢ(x)", "yᵢLᵢ(x)"], datos.filas.map(fila => [
        fila.indice, numero(fila.x), numero(fila.y), numero(fila.base), numero(fila.termino)
      ]));
      datos.filas.forEach(fila => {
        const factores = datos.puntos
          .filter((_, indice) => indice !== fila.indice)
          .map(punto => `(${numero(datos.x)} − ${numero(punto.x)})`)
          .join(" · ");
        texto(salida, `L${fila.indice}(${numero(datos.x)}) = ${factores} / (${numero(fila.denominador)}) = ${numero(fila.base)}.`);
      });
    }
    texto(salida, `P${datos.grado}(x) = ${expresionPolinomial(datos.coeficientes)}.`);
    if (datos.x !== null) {
      texto(salida, `P${datos.grado}(${numero(datos.x)}) = ${numero(datos.resultado)}.`, "h3");
      const valoresX = datos.puntos.map(punto => punto.x);
      if (datos.x < Math.min(...valoresX) || datos.x > Math.max(...valoresX)) texto(salida, "El valor de x está fuera del intervalo de los puntos; el resultado es una extrapolación.");
    }
    const evaluar = valor => datos.coeficientes.reduceRight((acumulado, coeficiente) => acumulado * valor + coeficiente, 0);
    salida.append(dibujarGrafica(datos.puntos, datos.x, datos.resultado, evaluar));
  });
}
