"use strict";

const FUNCIONES_MATEMATICAS = {
  sen: Math.sin, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  arcsen: Math.asin, asin: Math.asin, arccos: Math.acos, acos: Math.acos,
  arctan: Math.atan, atan: Math.atan,
  exp: Math.exp, ln: Math.log, log: Math.log, log10: Math.log10,
  raiz: Math.sqrt, sqrt: Math.sqrt, absoluto: Math.abs, abs: Math.abs
};

function leerFuncion(texto) {
  // Permite escribir e^3x como e^(3*x).
  texto = texto.replace(/\be\s*\^\s*((?:\d+(?:\.\d*)?|\.\d+))\s*x\b/gi, "e^($1*x)");
  const partes = [];
  const patron = /\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9]*|[()+\-*/^]/gy;
  let posicion = 0;
  while (posicion < texto.length) {
    patron.lastIndex = posicion;
    const coincidencia = patron.exec(texto);
    if (!coincidencia) throw new Error(`Símbolo no válido en la posición ${posicion + 1}.`);
    const valor = coincidencia[0];
    if (!/^\s+$/.test(valor)) partes.push(valor.toLowerCase());
    posicion = patron.lastIndex;
  }
  if (!partes.length) throw new Error("Escribe una función.");

  let indice = 0;
  const verSiguiente = () => partes[indice];
  const tomarSiguiente = () => partes[indice++];
  const patronNumero = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/;
  const patronNombre = /^[a-z][a-z0-9]*$/;

  function leerValor() {
    const parte = tomarSiguiente();
    if (parte === "(") {
      const resultado = leerSuma();
      if (tomarSiguiente() !== ")") throw new Error("Falta cerrar un paréntesis.");
      return resultado;
    }
    if (parte && patronNumero.test(parte)) {
      const valor = Number(parte);
      if (!Number.isFinite(valor)) throw new Error("Hay un número demasiado grande.");
      return () => valor;
    }
    if (parte === "x") return x => x;
    if (parte === "pi") return () => Math.PI;
    if (parte === "e") return () => Math.E;
    if (parte && patronNombre.test(parte)) {
      const funcionMatematica = FUNCIONES_MATEMATICAS[parte];
      if (!funcionMatematica) throw new Error(`Función o variable desconocida: ${parte}.`);
      if (tomarSiguiente() !== "(") throw new Error(`Escribe ${parte} con paréntesis, por ejemplo ${parte}(x).`);
      const argumento = leerSuma();
      if (tomarSiguiente() !== ")") throw new Error("Falta cerrar un paréntesis.");
      return x => funcionMatematica(argumento(x));
    }
    throw new Error("La expresión está incompleta o tiene un operador inesperado.");
  }

  function leerPotencia() {
    const izquierda = leerValor();
    if (verSiguiente() === "^") {
      tomarSiguiente();
      const derecha = leerSigno();
      return x => Math.pow(izquierda(x), derecha(x));
    }
    return izquierda;
  }

  function leerSigno() {
    if (verSiguiente() === "+") { tomarSiguiente(); return leerSigno(); }
    if (verSiguiente() === "-") { tomarSiguiente(); const expresion = leerSigno(); return x => -expresion(x); }
    return leerPotencia();
  }

  function leerProducto() {
    let izquierda = leerSigno();
    while (true) {
      const parte = verSiguiente();
      let operacion;
      if (parte === "*" || parte === "/") operacion = tomarSiguiente();
      else if (parte === "(" || (parte && (patronNumero.test(parte) || patronNombre.test(parte)))) operacion = "*";
      else break;
      const anterior = izquierda;
      const derecha = leerSigno();
      izquierda = operacion === "*" ? x => anterior(x) * derecha(x) : x => anterior(x) / derecha(x);
    }
    return izquierda;
  }

  function leerSuma() {
    let izquierda = leerProducto();
    while (verSiguiente() === "+" || verSiguiente() === "-") {
      const operacion = tomarSiguiente();
      const anterior = izquierda;
      const derecha = leerProducto();
      izquierda = operacion === "+" ? x => anterior(x) + derecha(x) : x => anterior(x) - derecha(x);
    }
    return izquierda;
  }

  const evaluar = leerSuma();
  if (indice !== partes.length) throw new Error(`Símbolo inesperado: ${verSiguiente()}.`);
  return x => {
    const valor = evaluar(x);
    if (!Number.isFinite(valor)) throw new Error(`La función no tiene un valor real finito en x = ${mostrarNumero(x)}.`);
    return valor;
  };
}

function mostrarNumero(valor) {
  return Number(Number(valor).toPrecision(12)).toString();
}

function revisarOpciones(errorPermitido, maximoIteraciones) {
  if (!Number.isFinite(errorPermitido) || errorPermitido <= 0) throw new Error("La tolerancia debe ser mayor que cero.");
  if (!Number.isInteger(maximoIteraciones) || maximoIteraciones < 1 || maximoIteraciones > 500) throw new Error("Las iteraciones máximas deben estar entre 1 y 500.");
}

function calcularBiseccion(f, a, b, errorPermitido, maximoIteraciones) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) throw new Error("Escribe dos extremos finitos con a menor que b.");
  let valorA = f(a);
  let valorB = f(b);
  if (valorA === 0) return { raiz: a, filas: [], terminado: true, explicacion: "El extremo izquierdo es una raíz exacta." };
  if (valorB === 0) return { raiz: b, filas: [], terminado: true, explicacion: "El extremo derecho es una raíz exacta." };
  if (Math.sign(valorA) === Math.sign(valorB)) throw new Error("f(a) y f(b) deben tener signos opuestos.");
  const filas = [];
  let medioAnterior = null;
  for (let i = 1; i <= maximoIteraciones; i++) {
    const medio = a + (b - a) / 2;
    if (medio === a || medio === b) return { raiz: medio, filas, terminado: true, explicacion: "Se alcanzó la precisión numérica disponible." };
    const valorMedio = f(medio);
    const error = medioAnterior === null || medio === 0 ? null : Math.abs((medio - medioAnterior) / medio) * 100;
    filas.push([i, a, b, medio, error === null ? "—" : `${mostrarPorcentaje(error)}%`]);
    if (valorMedio === 0) return { raiz: medio, filas, terminado: true, explicacion: "Se encontró una raíz exacta." };
    if (error !== null && error < errorPermitido) return { raiz: medio, filas, terminado: true, explicacion: `El error aproximado Ea es menor que ${mostrarNumero(errorPermitido)}%.` };
    if (Math.sign(valorA) === Math.sign(valorMedio)) { a = medio; valorA = valorMedio; }
    else { b = medio; valorB = valorMedio; }
    medioAnterior = medio;
  }
  return { raiz: filas.at(-1)[3], filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin alcanzar el error porcentual solicitado." };
}

function mostrarPorcentaje(valor) {
  return Number(valor.toFixed(2)).toString();
}

function calcularPuntoFijo(g, valorInicial, errorPermitido, maximoIteraciones, f = null) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (!Number.isFinite(valorInicial)) throw new Error("El valor inicial debe ser finito.");
  const filas = [];
  let x = valorInicial;
  for (let i = 1; i <= maximoIteraciones; i++) {
    const siguiente = g(x);
    filas.push([i, x, siguiente, f ? f(x) : "—"]);
    const error = siguiente === 0 ? (x === 0 ? 0 : Infinity) : Math.abs((siguiente - x) / siguiente) * 100;
    if (error < errorPermitido) return { raiz: siguiente, filas, terminado: true, explicacion: `El error aproximado Ea es ${mostrarNumero(error)}%, menor que ${mostrarNumero(errorPermitido)}%.` };
    x = siguiente;
  }
  return { raiz: x, filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin alcanzar el error porcentual solicitado." };
}

function calcularNewtonRaphson(f, derivada, valorInicial, errorPermitido, maximoIteraciones) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (!Number.isFinite(valorInicial)) throw new Error("El valor inicial debe ser finito.");
  const filas = [[0, valorInicial, f(valorInicial)]];
  let x = valorInicial;
  let valorFuncion = filas[0][2];
  if (valorFuncion === 0) return { raiz: x, filas, terminado: true, explicacion: "El valor inicial es una raíz exacta." };
  for (let i = 1; i <= maximoIteraciones; i++) {
    let pendiente;
    if (derivada) pendiente = derivada(x);
    else {
      // Calcula una derivada aproximada si no la escribiste.
      const h = Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(x));
      pendiente = (f(x + h) - f(x - h)) / (2 * h);
    }
    if (!Number.isFinite(pendiente) || Math.abs(pendiente) < 1e-14) throw new Error(`La derivada es cero o demasiado pequeña en x = ${mostrarNumero(x)}.`);
    const siguiente = x - valorFuncion / pendiente;
    if (!Number.isFinite(siguiente)) throw new Error("La iteración produjo un valor no finito.");
    const valor = f(siguiente);
    const error = siguiente === 0 ? (x === 0 ? 0 : Infinity) : Math.abs((siguiente - x) / siguiente) * 100;
    filas.push([i, siguiente, valor]);
    if (valor === 0) return { raiz: siguiente, filas, terminado: true, explicacion: "Se encontró una raíz exacta." };
    if (error < errorPermitido) return { raiz: siguiente, filas, terminado: true, explicacion: `El error aproximado Ea es ${mostrarNumero(error)}%, menor que ${mostrarNumero(errorPermitido)}%.` };
    x = siguiente;
    valorFuncion = valor;
  }
  return { raiz: x, filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin alcanzar el error porcentual solicitado." };
}

function mostrarTabla(contenedor, resultado, titulos) {
  contenedor.replaceChildren();
  const resumen = document.createElement("p");
  resumen.textContent = `${resultado.terminado ? "Resultado" : "Última aproximación"}: ${mostrarNumero(resultado.raiz)}. ${resultado.explicacion}`;
  contenedor.append(resumen);
  if (!resultado.filas.length) return;
  const tabla = document.createElement("table");
  tabla.border = "1";
  tabla.cellPadding = "4";
  const tituloTabla = document.createElement("caption");
  tituloTabla.textContent = "Iteraciones";
  tabla.append(tituloTabla);
  const encabezado = document.createElement("thead");
  const filaEncabezado = document.createElement("tr");
  titulos.forEach(titulo => {
    const celda = document.createElement("th");
    celda.scope = "col";
    celda.textContent = titulo;
    filaEncabezado.append(celda);
  });
  encabezado.append(filaEncabezado);
  tabla.append(encabezado);
  const cuerpo = document.createElement("tbody");
  resultado.filas.forEach(fila => {
    const linea = document.createElement("tr");
    fila.forEach(valor => {
      const celda = document.createElement("td");
      celda.textContent = typeof valor === "number" ? mostrarNumero(valor) : valor;
      linea.append(celda);
    });
    cuerpo.append(linea);
  });
  tabla.append(cuerpo);
  contenedor.append(tabla);
}

function mostrarResultadoNewton(contenedor, resultado) {
  contenedor.replaceChildren();
  const resumen = document.createElement("p");
  resumen.textContent = `${resultado.terminado ? "Resultado" : "Última aproximación"}: ${mostrarNumero(resultado.raiz)}. ${resultado.explicacion}`;
  contenedor.append(resumen);

  const tituloIteraciones = document.createElement("h3");
  tituloIteraciones.textContent = "Iteraciones";
  contenedor.append(tituloIteraciones);
  resultado.filas.forEach(([n, x]) => {
    const linea = document.createElement("p");
    linea.append(document.createTextNode("x"));
    const subindice = document.createElement("sub");
    subindice.textContent = String(n);
    linea.append(subindice, document.createTextNode(` = ${Number(x.toFixed(8))}`));
    contenedor.append(linea);
  });

  const tituloValores = document.createElement("h3");
  tituloValores.textContent = "Valores de f(x)";
  contenedor.append(tituloValores);
  const tabla = document.createElement("table");
  tabla.border = "1";
  tabla.cellPadding = "4";
  const encabezado = document.createElement("thead");
  const filaEncabezado = document.createElement("tr");
  ["x", "f(x)"].forEach(titulo => {
    const celda = document.createElement("th");
    celda.scope = "col";
    celda.textContent = titulo;
    filaEncabezado.append(celda);
  });
  encabezado.append(filaEncabezado);
  tabla.append(encabezado);
  const cuerpo = document.createElement("tbody");
  const primerValorTabla = Math.floor(resultado.valorInicial) - 3;
  for (let i = 0; i < 5; i++) {
    const x = primerValorTabla + i;
    const fila = document.createElement("tr");
    const celdaX = document.createElement("td");
    const celdaValor = document.createElement("td");
    celdaX.textContent = mostrarNumero(x);
    try { celdaValor.textContent = mostrarNumero(resultado.evaluar(x)); }
    catch { celdaValor.textContent = "no definida"; }
    fila.append(celdaX, celdaValor);
    cuerpo.append(fila);
  }
  tabla.append(cuerpo);
  contenedor.append(tabla);

  const tituloGrafica = document.createElement("h3");
  tituloGrafica.textContent = "Gráfica de f(x)";
  contenedor.append(tituloGrafica);
  contenedor.append(dibujarGraficaNewton(resultado));
}

function dibujarGraficaNewton(resultado) {
  const espacioSVG = "http://www.w3.org/2000/svg";
  const crearElemento = (tipo, atributos) => {
    const nodo = document.createElementNS(espacioSVG, tipo);
    Object.entries(atributos).forEach(([clave, valor]) => nodo.setAttribute(clave, String(valor)));
    return nodo;
  };
  const ancho = 500;
  const alto = 280;
  const margen = 35;
  const valores = resultado.filas.map(fila => fila[1]);
  const xMinimo = Math.min(resultado.valorInicial - 2.5, ...valores) - 0.01;
  const xMaximo = Math.max(resultado.valorInicial + 0.5, ...valores) + 0.01;
  const limiteY = Math.max(1.5, Math.abs(resultado.evaluar(resultado.valorInicial)) * 1.5);
  const aPixelX = x => margen + (x - xMinimo) / (xMaximo - xMinimo) * (ancho - 2 * margen);
  const aPixelY = y => alto / 2 - y / limiteY * (alto / 2 - margen);
  const grafica = crearElemento("svg", { viewBox: `0 0 ${ancho} ${alto}`, width: ancho, height: alto, role: "img", "aria-label": "Gráfica de f(x) con la raíz aproximada" });
  grafica.append(crearElemento("line", { x1: margen, y1: aPixelY(0), x2: ancho - margen, y2: aPixelY(0), stroke: "black" }));
  if (xMinimo <= 0 && xMaximo >= 0) grafica.append(crearElemento("line", { x1: aPixelX(0), y1: margen, x2: aPixelX(0), y2: alto - margen, stroke: "black" }));
  let trazo = "";
  let dibujando = false;
  for (let i = 0; i <= 500; i++) {
    const x = xMinimo + i / 500 * (xMaximo - xMinimo);
    try {
      const y = resultado.evaluar(x);
      if (Math.abs(y) > limiteY * 1.1) { dibujando = false; continue; }
      trazo += `${dibujando ? "L" : "M"}${aPixelX(x).toFixed(2)},${aPixelY(y).toFixed(2)} `;
      dibujando = true;
    } catch { dibujando = false; }
  }
  grafica.append(crearElemento("path", { d: trazo, fill: "none", stroke: "black", "stroke-width": 2 }));
  grafica.append(crearElemento("circle", { cx: aPixelX(resultado.raiz), cy: aPixelY(resultado.evaluar(resultado.raiz)), r: 4, fill: "black" }));
  const etiquetaX = crearElemento("text", { x: ancho - margen - 10, y: aPixelY(0) + 18 });
  etiquetaX.textContent = "x";
  grafica.append(etiquetaX);
  const etiquetaRaiz = crearElemento("text", { x: aPixelX(resultado.raiz) + 7, y: aPixelY(resultado.evaluar(resultado.raiz)) - 7 });
  etiquetaRaiz.textContent = "raíz";
  grafica.append(etiquetaRaiz);
  return grafica;
}

function leerNumero(formulario, nombre) {
  const campo = formulario.elements.namedItem(nombre);
  if (!campo.value.trim()) throw new Error(`Falta el campo ${nombre}.`);
  const valor = Number(campo.value);
  if (!Number.isFinite(valor)) throw new Error(`El campo ${nombre} debe ser un número finito.`);
  return valor;
}

if (typeof document !== "undefined") {
  const botones = Array.from(document.querySelectorAll("nav button[data-section]"));
  botones.forEach(boton => boton.addEventListener("click", () => {
    botones.forEach(otroBoton => {
      const seleccionado = otroBoton === boton;
      otroBoton.setAttribute("aria-pressed", String(seleccionado));
      document.getElementById(otroBoton.dataset.section).hidden = !seleccionado;
    });
    document.querySelector(`#${boton.dataset.section} h2`).focus();
  }));

  const prepararFormulario = (idFormulario, idResultado, calcular, titulos, mostrar = mostrarTabla) => {
    const formulario = document.getElementById(idFormulario);
    const contenedor = document.getElementById(idResultado);
    formulario.addEventListener("submit", evento => {
      evento.preventDefault();
      try {
        const resultado = calcular(formulario);
        mostrar(contenedor, resultado, titulos);
      } catch (error) {
        contenedor.replaceChildren();
        const mensaje = document.createElement("p");
        mensaje.textContent = `Error: ${error.message}`;
        contenedor.append(mensaje);
      }
    });
  };

  prepararFormulario("form-biseccion", "resultado-biseccion", formulario => calcularBiseccion(
    leerFuncion(formulario.elements.namedItem("funcion").value),
    leerNumero(formulario, "a"), leerNumero(formulario, "b"),
    leerNumero(formulario, "tolerancia"), leerNumero(formulario, "maximo")
  ), ["I", "Xi", "Xf", "Xm", "Ea(x)"]);

  prepararFormulario("form-punto-fijo", "resultado-punto-fijo", formulario => calcularPuntoFijo(
    leerFuncion(formulario.elements.namedItem("funcion").value),
    leerNumero(formulario, "x0"), leerNumero(formulario, "tolerancia"), leerNumero(formulario, "maximo"),
    leerFuncion(formulario.elements.namedItem("original").value)
  ), ["n", "X", "g₁(x)", "f(x)"]);

  prepararFormulario("form-newton", "resultado-newton", formulario => {
    const f = leerFuncion(formulario.elements.namedItem("funcion").value);
    const textoDerivada = formulario.elements.namedItem("derivada").value.trim();
    const derivada = textoDerivada ? leerFuncion(textoDerivada) : null;
    const valorInicial = leerNumero(formulario, "x0");
    return { ...calcularNewtonRaphson(f, derivada, valorInicial, leerNumero(formulario, "tolerancia"), leerNumero(formulario, "maximo")), evaluar: f, valorInicial };
  }, [], mostrarResultadoNewton);
}

if (typeof module !== "undefined") module.exports = { leerFuncion, calcularBiseccion, calcularPuntoFijo, calcularNewtonRaphson };