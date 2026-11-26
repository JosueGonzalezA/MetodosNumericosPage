"use strict";

const FUNCIONES_MATEMATICAS = {
  sen: Math.sin, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  arcsen: Math.asin, asin: Math.asin,
  arccos: Math.acos, acos: Math.acos,
  arctan: Math.atan, atan: Math.atan,
  exp: Math.exp, ln: Math.log, log: Math.log, log10: Math.log10,
  raiz: Math.sqrt, sqrt: Math.sqrt, cbrt: Math.cbrt,
  absoluto: Math.abs, abs: Math.abs
};

function calcularRaiz(valor, indice) {
  if (!Number.isSafeInteger(indice) || indice < 1) throw new Error("El índice de la raíz debe ser un entero positivo.");
  if (valor < 0 && indice % 2 === 0) throw new Error("La raíz de índice par de un número negativo no es real.");
  if (indice === 1) return valor;
  if (indice === 2) return Math.sqrt(valor);
  if (indice === 3) return Math.cbrt(valor);
  return valor < 0 ? -Math.pow(-valor, 1 / indice) : Math.pow(valor, 1 / indice);
}

function evaluarExpresion(nodo, x) {
  if (nodo.tipo === "numero") return nodo.valor;
  if (nodo.tipo === "variable") return x;
  if (nodo.tipo === "negativo") return -evaluarExpresion(nodo.argumento, x);
  if (nodo.tipo === "operacion") {
    const valorIzquierdo = evaluarExpresion(nodo.izquierda, x);
    const valorDerecho = evaluarExpresion(nodo.derecha, x);
    if (nodo.simbolo === "+") return valorIzquierdo + valorDerecho;
    if (nodo.simbolo === "-") return valorIzquierdo - valorDerecho;
    if (nodo.simbolo === "*") return valorIzquierdo * valorDerecho;
    if (nodo.simbolo === "/") return valorIzquierdo / valorDerecho;
    return Math.pow(valorIzquierdo, valorDerecho);
  }
  const valor = evaluarExpresion(nodo.argumento, x);
  if (nodo.indice) return calcularRaiz(valor, evaluarExpresion(nodo.indice, x));
  if (nodo.nombre === "signo") {
    if (valor === 0) throw new Error("La derivada de absoluto no existe en cero.");
    return Math.sign(valor);
  }
  const raizConIndice = /^raiz(\d+)$/.exec(nodo.nombre);
  if (raizConIndice) return calcularRaiz(valor, Number(raizConIndice[1]));
  const baseLogaritmo = /^log(\d+)$/.exec(nodo.nombre);
  if (baseLogaritmo) return Math.log(valor) / Math.log(Number(baseLogaritmo[1]));
  return FUNCIONES_MATEMATICAS[nodo.nombre](valor);
}

function operar(simbolo, izquierda, derecha) {
  if (izquierda.tipo === "numero" && derecha.tipo === "numero") {
    const valor = evaluarExpresion({ tipo: "operacion", simbolo, izquierda, derecha }, 0);
    if (Number.isFinite(valor)) return { tipo: "numero", valor };
  }
  const numeroIzquierdo = izquierda.tipo === "numero" ? izquierda.valor : null;
  const numeroDerecho = derecha.tipo === "numero" ? derecha.valor : null;
  if (simbolo === "+") {
    if (numeroIzquierdo === 0) return derecha;
    if (numeroDerecho === 0) return izquierda;
  }
  if (simbolo === "-") {
    if (numeroDerecho === 0) return izquierda;
    if (numeroIzquierdo === 0) return negar(derecha);
  }
  if (simbolo === "*") {
    if (numeroIzquierdo === 0 || numeroDerecho === 0) return { tipo: "numero", valor: 0 };
    if (numeroIzquierdo === 1) return derecha;
    if (numeroDerecho === 1) return izquierda;
  }
  if (simbolo === "/") {
    if (numeroIzquierdo === 0) return { tipo: "numero", valor: 0 };
    if (numeroDerecho === 1) return izquierda;
  }
  if (simbolo === "^") {
    if (numeroDerecho === 0) return { tipo: "numero", valor: 1 };
    if (numeroDerecho === 1) return izquierda;
  }
  return { tipo: "operacion", simbolo, izquierda, derecha };
}

function negar(nodo) {
  if (nodo.tipo === "numero") return { tipo: "numero", valor: -nodo.valor };
  if (nodo.tipo === "negativo") return nodo.argumento;
  return { tipo: "negativo", argumento: nodo };
}

function derivarExpresion(nodo) {
  const numero = valor => ({ tipo: "numero", valor });
  const funcion = (nombre, argumento) => ({ tipo: "funcion", nombre, argumento });
  const suma = (izquierda, derecha) => operar("+", izquierda, derecha);
  const resta = (izquierda, derecha) => operar("-", izquierda, derecha);
  const producto = (izquierda, derecha) => operar("*", izquierda, derecha);
  const division = (izquierda, derecha) => operar("/", izquierda, derecha);
  const potencia = (izquierda, derecha) => operar("^", izquierda, derecha);
  if (nodo.tipo === "numero") return numero(0);
  if (nodo.tipo === "variable") return numero(1);
  if (nodo.tipo === "negativo") return negar(derivarExpresion(nodo.argumento));
  if (nodo.tipo === "operacion") {
    const izquierda = nodo.izquierda;
    const derecha = nodo.derecha;
    const derivadaIzquierda = derivarExpresion(izquierda);
    const derivadaDerecha = derivarExpresion(derecha);
    if (nodo.simbolo === "+") return suma(derivadaIzquierda, derivadaDerecha);
    if (nodo.simbolo === "-") return resta(derivadaIzquierda, derivadaDerecha);
    if (nodo.simbolo === "*") return suma(producto(derivadaIzquierda, derecha), producto(izquierda, derivadaDerecha));
    if (nodo.simbolo === "/") return division(resta(producto(derivadaIzquierda, derecha), producto(izquierda, derivadaDerecha)), potencia(derecha, numero(2)));
    if (derivadaDerecha.tipo === "numero" && derivadaDerecha.valor === 0) {
      const exponente = evaluarExpresion(derecha, 0);
      return producto(producto(numero(exponente), potencia(izquierda, numero(exponente - 1))), derivadaIzquierda);
    }
    if (izquierda.tipo === "numero" && izquierda.valor === Math.E) return producto(nodo, derivadaDerecha);
    return producto(nodo, suma(producto(derivadaDerecha, funcion("ln", izquierda)), division(producto(derecha, derivadaIzquierda), izquierda)));
  }
  const argumento = nodo.argumento;
  const derivadaArgumento = derivarExpresion(argumento);
  const nombre = nodo.nombre;
  if (nodo.indice) {
    const indice = nodo.indice;
    const derivadaIndice = derivarExpresion(indice);
    if (derivadaIndice.tipo === "numero" && derivadaIndice.valor === 0) {
      const grado = evaluarExpresion(indice, 0);
      if (!Number.isSafeInteger(grado) || grado < 1) throw new Error("El índice de la raíz debe ser un entero positivo.");
      if (grado === 1) return derivadaArgumento;
      return division(derivadaArgumento, producto(numero(grado), potencia(nodo, numero(grado - 1))));
    }
    return producto(nodo, resta(division(derivadaArgumento, producto(indice, argumento)), division(producto(derivadaIndice, funcion("ln", argumento)), potencia(indice, numero(2)))));
  }
  const raizConIndice = /^raiz(\d+)$/.exec(nombre);
  if (nombre === "raiz" || raizConIndice) {
    const grado = raizConIndice ? Number(raizConIndice[1]) : 2;
    if (grado === 1) return derivadaArgumento;
    return division(derivadaArgumento, producto(numero(grado), potencia(nodo, numero(grado - 1))));
  }
  const baseLogaritmo = /^log(\d+)$/.exec(nombre);
  if (baseLogaritmo) return division(derivadaArgumento, producto(argumento, funcion("ln", numero(Number(baseLogaritmo[1])))));
  if (nombre === "ln" || nombre === "log") return division(derivadaArgumento, argumento);
  if (nombre === "exp") return producto(nodo, derivadaArgumento);
  if (nombre === "sen") return producto(funcion("cos", argumento), derivadaArgumento);
  if (nombre === "cos") return negar(producto(funcion("sen", argumento), derivadaArgumento));
  if (nombre === "tan") return division(derivadaArgumento, potencia(funcion("cos", argumento), numero(2)));
  if (nombre === "arcsen") return division(derivadaArgumento, funcion("raiz", resta(numero(1), potencia(argumento, numero(2)))));
  if (nombre === "arccos") return negar(division(derivadaArgumento, funcion("raiz", resta(numero(1), potencia(argumento, numero(2))))));
  if (nombre === "arctan") return division(derivadaArgumento, suma(numero(1), potencia(argumento, numero(2))));
  if (nombre === "absoluto") return producto(funcion("signo", argumento), derivadaArgumento);
  throw new Error(`No puedo derivar ${nombre}.`);
}

function mostrarExpresion(nodo, prioridadPadre = 0) {
  if (nodo.tipo === "numero") return nodo.texto ?? mostrarNumero(nodo.valor);
  if (nodo.tipo === "variable") return "x";
  if (nodo.tipo === "funcion") return `${nodo.nombre}(${mostrarExpresion(nodo.argumento)}${nodo.indice ? `,${mostrarExpresion(nodo.indice)}` : ""})`;
  if (nodo.tipo === "negativo") {
    const texto = `-${mostrarExpresion(nodo.argumento, 3)}`;
    return prioridadPadre > 3 ? `(${texto})` : texto;
  }
  const prioridad = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 }[nodo.simbolo];
  const izquierda = mostrarExpresion(nodo.izquierda, nodo.simbolo === "^" ? prioridad + 1 : prioridad);
  const derecha = mostrarExpresion(nodo.derecha, nodo.simbolo === "-" || nodo.simbolo === "/" ? prioridad + 1 : prioridad);
  const texto = `${izquierda}${nodo.simbolo}${derecha}`;
  return prioridad < prioridadPadre ? `(${texto})` : texto;
}

function derivarFuncion(funcionOriginal) {
  const arbol = derivarExpresion(funcionOriginal.arbol);
  return {
    texto: mostrarExpresion(arbol),
    evaluar: x => {
      const valor = evaluarExpresion(arbol, x);
      if (!Number.isFinite(valor)) throw new Error(`La derivada no tiene un valor real finito en x = ${mostrarNumero(x)}.`);
      return valor;
    }
  };
}

function leerFuncion(texto) {
  const superindices = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
  const subindices = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  texto = texto.trim()
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*√\s*\(/g, (_, grado) => `raiz${[...grado].map(simbolo => superindices[simbolo]).join("")}(`)
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*√\s*x\b/gi, (_, grado) => `raiz${[...grado].map(simbolo => superindices[simbolo]).join("")}(x)`)
    .replace(/√\s*\[\s*(\d+)\s*\]\s*\(/g, "raiz$1(")
    .replace(/√\s*\[\s*(\d+)\s*\]\s*x\b/gi, "raiz$1(x)")
    .replace(/[−–]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/gi, "pi")
    .replace(/\*\*/g, "^")
    .replace(/\braiz_(\d+)\b/gi, "raiz$1")
    .replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, parte => "^" + [...parte].map(simbolo => superindices[simbolo]).join(""))
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, simbolo => subindices[simbolo])
    .replace(/√\s*\(/g, "raiz(")
    .replace(/√\s*x\b/gi, "raiz(x)")
    .replace(/√\s*(\d+(?:\.\d+)?)/g, "raiz($1)")
    .replace(/\blog\s*_?\s*(\d+)\s*x\b/gi, "log$1(x)")
    .replace(/\blog_(\d+)\b/gi, "log$1")
    .replace(/\b(ln|log|sen|sin|cos|tan|raiz|sqrt|abs|absoluto)\s*x\b/gi, "$1(x)")
    .replace(/\be\s*\^\s*((?:\d+(?:\.\d*)?|\.\d+))\s*x\b/gi, "e^($1*x)");
  const partes = [];
  const patron = /\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9]*|[(),+\-*/^]/gy;
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
      return { tipo: "numero", valor };
    }
    if (parte === "x") return { tipo: "variable" };
    if (parte === "pi") return { tipo: "numero", valor: Math.PI, texto: "pi" };
    if (parte === "e") return { tipo: "numero", valor: Math.E, texto: "e" };
    if (parte && patronNombre.test(parte)) {
      const baseLogaritmo = /^log(\d+)$/.exec(parte);
      const base = baseLogaritmo ? Number(baseLogaritmo[1]) : null;
      if (baseLogaritmo && (!Number.isFinite(base) || base <= 0 || base === 1)) throw new Error("La base del logaritmo debe ser positiva y distinta de 1.");
      const raizConIndice = /^raiz(\d+)$/.exec(parte);
      const indiceRaiz = raizConIndice ? Number(raizConIndice[1]) : null;
      if (raizConIndice && (!Number.isSafeInteger(indiceRaiz) || indiceRaiz < 1)) throw new Error("El índice de la raíz debe ser un entero positivo.");
      if (!baseLogaritmo && !raizConIndice && !FUNCIONES_MATEMATICAS[parte]) throw new Error(`Función o variable desconocida: ${parte}.`);
      if (tomarSiguiente() !== "(") throw new Error(`Escribe ${parte} con paréntesis, por ejemplo ${parte}(x).`);
      const argumento = leerSuma();
      if (parte === "raiz" && verSiguiente() === ",") {
        tomarSiguiente();
        const grado = leerSuma();
        if (tomarSiguiente() !== ")") throw new Error("Falta cerrar un paréntesis.");
        return { tipo: "funcion", nombre: "raiz", argumento, indice: grado };
      }
      if (tomarSiguiente() !== ")") throw new Error("Falta cerrar un paréntesis.");
      const alias = { sin: "sen", asin: "arcsen", acos: "arccos", atan: "arctan", sqrt: "raiz", cbrt: "raiz3", abs: "absoluto" };
      return { tipo: "funcion", nombre: alias[parte] ?? parte, argumento };
    }
    throw new Error("La expresión está incompleta o tiene un operador inesperado.");
  }

  function leerPotencia() {
    const izquierda = leerValor();
    if (verSiguiente() === "^") {
      tomarSiguiente();
      const derecha = leerSigno();
      return { tipo: "operacion", simbolo: "^", izquierda, derecha };
    }
    return izquierda;
  }

  function leerSigno() {
    if (verSiguiente() === "+") { tomarSiguiente(); return leerSigno(); }
    if (verSiguiente() === "-") { tomarSiguiente(); const expresion = leerSigno(); return { tipo: "negativo", argumento: expresion }; }
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
      izquierda = { tipo: "operacion", simbolo: operacion, izquierda: anterior, derecha };
    }
    return izquierda;
  }

  function leerSuma() {
    let izquierda = leerProducto();
    while (verSiguiente() === "+" || verSiguiente() === "-") {
      const operacion = tomarSiguiente();
      const anterior = izquierda;
      const derecha = leerProducto();
      izquierda = { tipo: "operacion", simbolo: operacion, izquierda: anterior, derecha };
    }
    return izquierda;
  }

  const arbol = leerSuma();
  if (indice !== partes.length) throw new Error(`Símbolo inesperado: ${verSiguiente()}.`);
  const funcion = x => {
    const valor = evaluarExpresion(arbol, x);
    if (!Number.isFinite(valor)) throw new Error(`La función no tiene un valor real finito en x = ${mostrarNumero(x)}.`);
    return valor;
  };
  funcion.arbol = arbol;
  return funcion;
}

function mostrarNumero(valor) {
  return Number(Number(valor).toPrecision(12)).toString();
}

function revisarOpciones(errorPermitido, maximoIteraciones) {
  if (!Number.isFinite(errorPermitido) || errorPermitido <= 0) throw new Error("La tolerancia debe ser mayor que cero.");
  if (!Number.isInteger(maximoIteraciones) || maximoIteraciones < 1 || maximoIteraciones > 500) throw new Error("Las iteraciones máximas deben estar entre 1 y 500.");
}

function buscarIntervalo(funcion, extremoIzquierdo, extremoDerecho) {
  const valorEn = x => {
    try {
      const valor = funcion(x);
      return Number.isFinite(valor) ? valor : null;
    } catch {
      return null;
    }
  };

  if (extremoIzquierdo != null || extremoDerecho != null) {
    const extremo = extremoIzquierdo ?? extremoDerecho;
    const valorExtremo = funcion(extremo);
    if (valorExtremo === 0) return { raizExacta: extremo };
    for (let paso = 0.125; paso <= 1048576; paso *= 2) {
      const otro = extremoIzquierdo != null ? extremo + paso : extremo - paso;
      const valorOtro = valorEn(otro);
      if (valorOtro === null) continue;
      if (valorOtro === 0) return { raizExacta: otro };
      if (Math.sign(valorExtremo) !== Math.sign(valorOtro)) {
        return { izquierdo: Math.min(extremo, otro), derecho: Math.max(extremo, otro) };
      }
    }
    throw new Error("No encontré un intervalo con cambio de signo desde el extremo indicado.");
  }

  for (let radio = 2; radio <= 1048576; radio *= 2) {
    const puntos = [];
    for (let indicePunto = -64; indicePunto <= 64; indicePunto++) {
      const x = radio * indicePunto / 64;
      puntos.push({ x, valor: valorEn(x) });
    }
    const candidatos = [];
    const paso = radio / 64;
    for (let indicePunto = 0; indicePunto < puntos.length; indicePunto++) {
      const actual = puntos[indicePunto];
      const anterior = puntos[indicePunto - 1];
      const vecinoIzquierdo = anterior ?? { x: actual.x - paso, valor: valorEn(actual.x - paso) };
      const vecinoDerecho = puntos[indicePunto + 1] ?? { x: actual.x + paso, valor: valorEn(actual.x + paso) };
      if (actual.valor === 0) {
        if (vecinoIzquierdo.valor !== null && vecinoDerecho.valor !== null
            && Math.sign(vecinoIzquierdo.valor) !== Math.sign(vecinoDerecho.valor)) {
          candidatos.push({ izquierdo: vecinoIzquierdo.x, derecho: vecinoDerecho.x });
        } else {
          candidatos.push({ raizExacta: actual.x });
        }
      }
      if (anterior && anterior.valor !== null && actual.valor !== null
          && anterior.valor !== 0 && actual.valor !== 0
          && Math.sign(anterior.valor) !== Math.sign(actual.valor)) {
        candidatos.push({ izquierdo: anterior.x, derecho: actual.x });
      }
    }
    if (candidatos.length) {
      const centro = candidato => candidato.raizExacta ?? (candidato.izquierdo / 2 + candidato.derecho / 2);
      candidatos.sort((primero, segundo) => Math.abs(centro(primero)) - Math.abs(centro(segundo)) || centro(segundo) - centro(primero));
      return candidatos[0];
    }
  }
  throw new Error("No encontré un intervalo con cambio de signo. La función puede no tener raíces reales cercanas; escribe Xi y Xf para elegir otra zona.");
}

function calcularBiseccion(funcion, extremoIzquierdo, extremoDerecho, errorPermitido, maximoIteraciones) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (extremoIzquierdo != null && !Number.isFinite(extremoIzquierdo)) throw new Error("Xi debe ser un número finito.");
  if (extremoDerecho != null && !Number.isFinite(extremoDerecho)) throw new Error("Xf debe ser un número finito.");
  if (extremoIzquierdo == null || extremoDerecho == null) {
    const intervalo = buscarIntervalo(funcion, extremoIzquierdo, extremoDerecho);
    if ("raizExacta" in intervalo) {
      return { raiz: intervalo.raizExacta, filas: [], terminado: true,
        explicacion: "Se encontró una raíz exacta al buscar el intervalo." };
    }
    const resultado = calcularBiseccionConRango(funcion, intervalo.izquierdo, intervalo.derecho, errorPermitido, maximoIteraciones);
    resultado.intervaloAutomatico = [intervalo.izquierdo, intervalo.derecho];
    return resultado;
  }
  return calcularBiseccionConRango(funcion, extremoIzquierdo, extremoDerecho, errorPermitido, maximoIteraciones);
}

function calcularBiseccionConRango(funcion, extremoIzquierdo, extremoDerecho, errorPermitido, maximoIteraciones) {
  if (!Number.isFinite(extremoIzquierdo) || !Number.isFinite(extremoDerecho) || extremoIzquierdo >= extremoDerecho) throw new Error("Escribe dos extremos finitos con Xi menor que Xf.");
  let valorIzquierdo = funcion(extremoIzquierdo);
  let valorDerecho = funcion(extremoDerecho);
  if (valorIzquierdo === 0) return { raiz: extremoIzquierdo, filas: [], terminado: true, explicacion: "El extremo izquierdo es una raíz exacta." };
  if (valorDerecho === 0) return { raiz: extremoDerecho, filas: [], terminado: true, explicacion: "El extremo derecho es una raíz exacta." };
  if (Math.sign(valorIzquierdo) === Math.sign(valorDerecho)) throw new Error("f(Xi) y f(Xf) deben tener signos opuestos.");
  const limiteResiduo = Math.min(Math.abs(valorIzquierdo), Math.abs(valorDerecho)) * Math.min(errorPermitido / 100, 0.5);
  const filas = [];
  let medioAnterior = null;
  for (let iteracion = 1; iteracion <= maximoIteraciones; iteracion++) {
    const medio = extremoIzquierdo / 2 + extremoDerecho / 2;
    if (medio === extremoIzquierdo || medio === extremoDerecho) return { raiz: medio, filas, terminado: false, explicacion: "Se agotó la precisión numérica. Comprueba que la función sea continua en el intervalo." };
    const valorMedio = funcion(medio);
    const error = medioAnterior === null || medio === 0 ? null : Math.abs((medio - medioAnterior) / medio) * 100;
    filas.push([iteracion, extremoIzquierdo, extremoDerecho, medio, error === null ? "—" : `${mostrarPorcentaje(error)}%`]);
    if (valorMedio === 0) return { raiz: medio, filas, terminado: true, explicacion: "Se encontró una raíz exacta." };
    if (error !== null && error < errorPermitido && Math.abs(valorMedio) <= limiteResiduo) {
      return { raiz: medio, filas, terminado: true, explicacion: `El error aproximado Ea es menor que ${mostrarNumero(errorPermitido)}%.` };
    }
    if (Math.sign(valorIzquierdo) === Math.sign(valorMedio)) { extremoIzquierdo = medio; valorIzquierdo = valorMedio; }
    else { extremoDerecho = medio; valorDerecho = valorMedio; }
    medioAnterior = medio;
  }
  return { raiz: filas.at(-1)[3], filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin cumplir la tolerancia y comprobar f(x) cercano a cero. Revisa que la función sea continua." };
}

function mostrarPorcentaje(valor) {
  return Number(valor.toFixed(2)).toString();
}

function calcularPuntoFijo(funcionIteracion, valorInicial, errorPermitido, maximoIteraciones, funcionOriginal = null) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (!Number.isFinite(valorInicial)) throw new Error("El valor inicial debe ser finito.");
  const filas = [];
  const residuoInicial = funcionOriginal ? Math.abs(funcionOriginal(valorInicial)) : null;
  let derivadaOriginal = null;
  if (funcionOriginal?.arbol) {
    try { derivadaOriginal = derivarFuncion(funcionOriginal).evaluar; }
    catch { derivadaOriginal = null; }
  }
  if (residuoInicial === 0) return { raiz: valorInicial, filas, terminado: true, explicacion: "El valor inicial es una raíz exacta." };
  let ceroEsRaiz = false;
  if (funcionOriginal) {
    try { ceroEsRaiz = funcionOriginal(0) === 0; }
    catch { ceroEsRaiz = false; }
  }
  let correccionInicial = null;
  if (derivadaOriginal) {
    try {
      const correccion = Math.abs(residuoInicial / derivadaOriginal(valorInicial));
      if (Number.isFinite(correccion) && correccion > 0) correccionInicial = correccion;
    } catch { correccionInicial = null; }
  }
  const limiteCercaDeCero = Math.max(1, Math.abs(valorInicial)) * errorPermitido / 100;
  let x = valorInicial;
  for (let iteracion = 1; iteracion <= maximoIteraciones; iteracion++) {
    const siguiente = funcionIteracion(x);
    if (!Number.isFinite(siguiente)) throw new Error("La iteración produjo un valor no finito.");
    filas.push([iteracion, x, siguiente, funcionOriginal ? funcionOriginal(x) : "—"]);
    const residuo = funcionOriginal ? Math.abs(funcionOriginal(siguiente)) : null;
    if (residuo === 0) return { raiz: siguiente, filas, terminado: true, explicacion: "Se encontró una raíz exacta." };
    const error = siguiente === 0 ? (x === 0 ? 0 : Infinity) : Math.abs((siguiente - x) / siguiente) * 100;
    const residuoAceptable = !funcionOriginal || residuo <= residuoInicial * 0.01;
    const cercaDeCero = Math.abs(siguiente) <= limiteCercaDeCero;
    const cambioPequenoCercaDeCero = cercaDeCero && Math.abs(siguiente - x) <= limiteCercaDeCero && (!funcionOriginal || ceroEsRaiz);
    let errorRaizAceptable = true;
    if (derivadaOriginal) {
      try {
        const pendiente = derivadaOriginal(siguiente);
        const correccion = Math.abs(residuo / pendiente);
        const limiteCorreccion = cercaDeCero ? limiteCercaDeCero : Math.abs(siguiente) * errorPermitido / 100;
        const limiteDesdeInicio = correccionInicial === null ? Infinity : 2 * correccionInicial * errorPermitido / 100;
        errorRaizAceptable = Number.isFinite(correccion) && correccion <= limiteCorreccion && correccion <= limiteDesdeInicio;
      } catch { errorRaizAceptable = false; }
    }
    if ((error < errorPermitido || cambioPequenoCercaDeCero) && residuoAceptable && errorRaizAceptable) {
      return { raiz: siguiente, filas, terminado: true, explicacion: error < errorPermitido
        ? `El error aproximado Ea es ${mostrarNumero(error)}%, menor que ${mostrarNumero(errorPermitido)}%.`
        : "La aproximación está cerca de cero y el cambio absoluto y f(x) son pequeños." };
    }
    x = siguiente;
  }
  return { raiz: x, filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin cumplir la tolerancia y comprobar f(x) cercano a cero." };
}

function crearFormasPuntoFijo(funcionOriginal, valorInicial, textoFuncion) {
  if (!Number.isFinite(valorInicial)) throw new Error("El valor inicial debe ser finito.");
  const derivada = derivarFuncion(funcionOriginal).evaluar;
  const valorInicialFuncion = funcionOriginal(valorInicial);
  const posiciones = [valorInicial, valorInicial + 1, valorInicial - 1, valorInicial + 0.5, valorInicial - 0.5, valorInicial + 2, valorInicial - 2, valorInicial + 4, valorInicial - 4, valorInicial + 8, valorInicial - 8];
  const pendientes = [];
  for (const posicion of posiciones) {
    try {
      const pendiente = derivada(posicion);
      if (!Number.isFinite(pendiente) || pendiente === 0) continue;
      const siguiente = valorInicial - valorInicialFuncion / pendiente;
      if (!Number.isFinite(siguiente)) continue;
      const residuo = Math.abs(funcionOriginal(siguiente));
      if (Number.isFinite(residuo)) pendientes.push({ pendiente, residuo, salto: Math.abs(siguiente - valorInicial), posicion });
    } catch { continue; }
  }
  if (!pendientes.length && valorInicialFuncion === 0) pendientes.push({ pendiente: 1, residuo: 0, salto: 0, posicion: valorInicial });
  if (!pendientes.length) throw new Error("No encontré una pendiente útil para crear g(x). Prueba otro valor inicial.");
  const primera = pendientes[0];
  const limiteSalto = 4 * Math.max(1, Math.abs(valorInicial));
  const elegida = primera.posicion === valorInicial && primera.salto <= limiteSalto
    ? primera
    : pendientes.sort((primeraPendiente, segundaPendiente) => primeraPendiente.residuo - segundaPendiente.residuo || primeraPendiente.salto - segundaPendiente.salto)[0];
  return [1, 0.5, 0.25].map((factor, indice) => {
    const paso = factor / elegida.pendiente;
    if (!Number.isFinite(paso) || paso === 0) throw new Error("No pude crear una forma válida de g(x). Prueba otro valor inicial.");
    const coeficiente = -paso;
    const nombre = ["g₁(x)", "g₂(x)", "g₃(x)"][indice];
    return { nombre, texto: `${nombre}=x${coeficiente >= 0 ? "+" : ""}${mostrarNumero(coeficiente)}*(${textoFuncion})`, funcion: x => x - paso * funcionOriginal(x) };
  });
}

function calcularPuntoFijoAutomatico(funcionOriginal, valorInicial, errorPermitido, maximoIteraciones, textoFuncion, opcion = "auto") {
  revisarOpciones(errorPermitido, maximoIteraciones);
  const formas = crearFormasPuntoFijo(funcionOriginal, valorInicial, textoFuncion);
  const elegidas = opcion === "auto" ? formas : formas.filter((_, indice) => String(indice + 1) === opcion);
  if (!elegidas.length) throw new Error("Elige una forma de g(x) válida.");
  const pruebas = [];
  for (const forma of elegidas) {
    try {
      const resultado = calcularPuntoFijo(forma.funcion, valorInicial, errorPermitido, maximoIteraciones, funcionOriginal);
      pruebas.push({ forma, resultado, residuo: Math.abs(funcionOriginal(resultado.raiz)) });
    } catch (error) {
      if (opcion !== "auto") throw error;
    }
  }
  if (!pruebas.length) throw new Error("Ninguna forma de g(x) pudo iterar. Revisa si hay una raíz real o prueba otro valor inicial.");
  pruebas.sort((primeraPrueba, segundaPrueba) => Number(segundaPrueba.resultado.terminado) - Number(primeraPrueba.resultado.terminado) || primeraPrueba.residuo - segundaPrueba.residuo || primeraPrueba.resultado.filas.length - segundaPrueba.resultado.filas.length);
  const mejor = pruebas[0];
  return { ...mejor.resultado, nombreForma: mejor.forma.nombre, formaUsada: mejor.forma.texto, residuoFinal: mejor.residuo };
}

function calcularNewtonRaphson(funcionOriginal, valorInicial, errorPermitido, maximoIteraciones) {
  revisarOpciones(errorPermitido, maximoIteraciones);
  if (!Number.isFinite(valorInicial)) throw new Error("El valor inicial debe ser finito.");
  const derivadaAutomatica = derivarFuncion(funcionOriginal).evaluar;
  const filas = [[0, valorInicial, funcionOriginal(valorInicial)]];
  let x = valorInicial;
  let valorFuncion = filas[0][2];
  const residuoInicial = Math.abs(valorFuncion);
  if (valorFuncion === 0) return { raiz: x, filas, terminado: true, explicacion: "El valor inicial es una raíz exacta." };
  for (let iteracion = 1; iteracion <= maximoIteraciones; iteracion++) {
    const pendiente = derivadaAutomatica(x);
    if (!Number.isFinite(pendiente) || pendiente === 0) throw new Error(`La derivada es cero o no está definida en x = ${mostrarNumero(x)}.`);
    const siguiente = x - valorFuncion / pendiente;
    if (!Number.isFinite(siguiente)) throw new Error("La iteración produjo un valor no finito.");
    const valor = funcionOriginal(siguiente);
    const error = siguiente === 0 ? (x === 0 ? 0 : Infinity) : Math.abs((siguiente - x) / siguiente) * 100;
    filas.push([iteracion, siguiente, valor]);
    if (valor === 0) return { raiz: siguiente, filas, terminado: true, explicacion: "Se encontró una raíz exacta." };
    const residuoAceptable = Math.abs(valor) <= residuoInicial * Math.min(errorPermitido / 100, 1);
    const cambioPequeno = Math.abs(siguiente - x) <= Math.max(1, Math.abs(valorInicial)) * errorPermitido / 100;
    if ((error < errorPermitido || cambioPequeno) && residuoAceptable) {
      return { raiz: siguiente, filas, terminado: true, explicacion: error < errorPermitido
        ? `El error aproximado Ea es ${mostrarNumero(error)}%, menor que ${mostrarNumero(errorPermitido)}%.`
        : "El cambio entre iteraciones y el valor de f(x) son suficientemente pequeños." };
    }
    x = siguiente;
    valorFuncion = valor;
  }
  return { raiz: x, filas, terminado: false, explicacion: "Se llegó al máximo de iteraciones sin cumplir la tolerancia y comprobar f(x) cercano a cero." };
}

function mostrarTabla(contenedor, resultado, titulos) {
  contenedor.replaceChildren();
  const resumen = document.createElement("p");
  resumen.textContent = `${resultado.terminado ? "Resultado" : "Última aproximación"}: ${mostrarNumero(resultado.raiz)}. ${resultado.explicacion}`;
  contenedor.append(resumen);
  if (resultado.residuoFinal !== undefined) {
    const comprobacion = document.createElement("p");
    comprobacion.textContent = `Comprobación |f(x)|: ${mostrarNumero(resultado.residuoFinal)}.`;
    contenedor.append(comprobacion);
  }
  if (resultado.formaUsada) {
    const forma = document.createElement("p");
    forma.textContent = `Forma usada: ${resultado.formaUsada}`;
    contenedor.append(forma);
  }
  if (resultado.intervaloAutomatico) {
    const intervalo = document.createElement("p");
    intervalo.textContent = `Intervalo encontrado: [${mostrarNumero(resultado.intervaloAutomatico[0])}, ${mostrarNumero(resultado.intervaloAutomatico[1])}]`;
    contenedor.append(intervalo);
  }
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
  resultado.filas.forEach(([iteracion, x]) => {
    const linea = document.createElement("p");
    linea.append(document.createTextNode("x"));
    const subindice = document.createElement("sub");
    subindice.textContent = String(iteracion);
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
  for (let indiceValor = 0; indiceValor < 5; indiceValor++) {
    const x = primerValorTabla + indiceValor;
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
  const ancho = 640;
  const alto = 350;
  const margenIzquierdo = 58;
  const margenDerecho = 20;
  const margenSuperior = 22;
  const margenInferior = 48;
  const valores = resultado.filas.map(fila => fila[1]);
  const xBaseMinimo = Math.min(resultado.valorInicial, ...valores);
  const xBaseMaximo = Math.max(resultado.valorInicial, ...valores);
  const margenX = Math.max((xBaseMaximo - xBaseMinimo) * 0.35, 0.5);
  const xMinimo = xBaseMinimo - margenX;
  const xMaximo = xBaseMaximo + margenX;
  const derecha = ancho - margenDerecho;
  const abajo = alto - margenInferior;
  const aPixelX = x => margenIzquierdo + (x - xMinimo) / (xMaximo - xMinimo) * (derecha - margenIzquierdo);
  const muestras = [];
  const valoresY = [];
  for (let indice = 0; indice <= 500; indice++) {
    const x = xMinimo + indice / 500 * (xMaximo - xMinimo);
    try {
      const y = resultado.evaluar(x);
      muestras.push({ x, y });
      valoresY.push(y);
    } catch { muestras.push(null); }
  }
  const yRaiz = resultado.evaluar(resultado.raiz);
  valoresY.push(yRaiz, resultado.evaluar(resultado.valorInicial));
  const yBaseMinimo = Math.min(...valoresY);
  const yBaseMaximo = Math.max(...valoresY);
  const margenY = Math.max((yBaseMaximo - yBaseMinimo) * 0.12, 0.1);
  const yMinimo = yBaseMinimo - margenY;
  const yMaximo = yBaseMaximo + margenY;
  const aPixelY = y => abajo - (y - yMinimo) / (yMaximo - yMinimo) * (abajo - margenSuperior);
  const grafica = crearElemento("svg", {
    viewBox: `0 0 ${ancho} ${alto}`, role: "img",
    "aria-label": "Gráfica de f(x) con cuadrícula, iteraciones y raíz aproximada",
    class: "grafica-interpolacion"
  });
  grafica.append(crearElemento("rect", { x: 0, y: 0, width: ancho, height: alto, fill: "#fff" }));
  for (let indice = 0; indice <= 6; indice++) {
    const valor = xMinimo + (xMaximo - xMinimo) * indice / 6;
    const x = aPixelX(valor);
    grafica.append(crearElemento("line", { x1: x, y1: margenSuperior, x2: x, y2: abajo, stroke: "#dce3e9" }));
    const numero = crearElemento("text", { x, y: abajo + 19, "text-anchor": "middle", fill: "#263447", "font-size": 11 });
    numero.textContent = mostrarNumero(valor);
    grafica.append(numero);
  }
  for (let indice = 0; indice <= 5; indice++) {
    const valor = yMinimo + (yMaximo - yMinimo) * indice / 5;
    const y = aPixelY(valor);
    grafica.append(crearElemento("line", { x1: margenIzquierdo, y1: y, x2: derecha, y2: y, stroke: "#dce3e9" }));
    const numero = crearElemento("text", { x: margenIzquierdo - 7, y: y + 4, "text-anchor": "end", fill: "#263447", "font-size": 11 });
    numero.textContent = mostrarNumero(valor);
    grafica.append(numero);
  }
  if (xMinimo <= 0 && xMaximo >= 0) grafica.append(crearElemento("line", { x1: aPixelX(0), y1: margenSuperior, x2: aPixelX(0), y2: abajo, stroke: "#6a7889" }));
  if (yMinimo <= 0 && yMaximo >= 0) grafica.append(crearElemento("line", { x1: margenIzquierdo, y1: aPixelY(0), x2: derecha, y2: aPixelY(0), stroke: "#6a7889" }));
  let trazo = "";
  let dibujando = false;
  for (const muestra of muestras) {
    if (!muestra) { dibujando = false; continue; }
    trazo += `${dibujando ? "L" : "M"}${aPixelX(muestra.x).toFixed(2)},${aPixelY(muestra.y).toFixed(2)} `;
    dibujando = true;
  }
  grafica.append(crearElemento("path", { d: trazo, fill: "none", stroke: "#14538a", "stroke-width": 2.5 }));
  valores.forEach(x => {
    try {
      grafica.append(crearElemento("circle", { cx: aPixelX(x), cy: aPixelY(resultado.evaluar(x)), r: 3.5, fill: "#1f2b3b" }));
    } catch {}
  });
  grafica.append(crearElemento("circle", { cx: aPixelX(resultado.raiz), cy: aPixelY(yRaiz), r: 6, fill: "#b99050", stroke: "#1f2b3b" }));
  const etiquetaX = crearElemento("text", { x: derecha - 3, y: abajo - 8, "text-anchor": "end", fill: "#263447", "font-size": 12 });
  etiquetaX.textContent = "x";
  grafica.append(etiquetaX);
  const etiquetaY = crearElemento("text", { x: margenIzquierdo + 7, y: margenSuperior + 14, fill: "#263447", "font-size": 12 });
  etiquetaY.textContent = "f(x)";
  grafica.append(etiquetaY);
  const etiquetaRaiz = crearElemento("text", { x: aPixelX(resultado.raiz) + 8, y: aPixelY(yRaiz) - 8, fill: "#263447", "font-size": 11 });
  etiquetaRaiz.textContent = "raíz";
  grafica.append(etiquetaRaiz);
  return grafica;
}

function leerNumero(formulario, nombre) {
  const campo = formulario.elements.namedItem(nombre);
  if (!campo.value.trim()) throw new Error(`Falta el campo ${nombre}.`);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(campo.value.trim())) {
    throw new Error(`El campo ${nombre} debe ser un número decimal finito.`);
  }
  const valor = Number(campo.value);
  if (!Number.isFinite(valor)) throw new Error(`El campo ${nombre} debe ser un número finito.`);
  return valor;
}

function leerNumeroOpcional(formulario, nombre) {
  const campo = formulario.elements.namedItem(nombre);
  return campo.value.trim() === "" ? null : leerNumero(formulario, nombre);
}

if (typeof document !== "undefined") {
  const filasTeclado = [
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."],
    ["x", "π", "e"],
    ["+", "−", "×", "÷", "(", ")"],
    ["^", "x²", "x³", "eˣ", "exp", "ln", "log", "log₂", "log₁₀"],
    ["√", "∛", "raíz n", "|x|"],
    ["sen", "cos", "tan"],
    ["arcsen", "arccos", "arctan"],
    ["Limpiar"]
  ];
  const inserciones = {
    "−": "-", "×": "*", "÷": "/", "x²": "x^2", "x³": "x^3", "eˣ": "e^()",
    "log₂": "log2()", "log₁₀": "log10()", "√": "raiz()", "∛": "raiz3()", "|x|": "absoluto()"
  };
  const funciones = new Set(["ln", "log", "exp", "sen", "cos", "tan", "arcsen", "arccos", "arctan"]);

  document.querySelectorAll("[data-teclado]").forEach(contenedor => {
    const campo = document.getElementById(contenedor.dataset.teclado);
    const formulario = contenedor.closest?.("form") ?? campo.form;
    const camposFuncion = new Set([campo, ...formulario.querySelectorAll("[data-campo-funcion]")]);
    const posiciones = new WeakMap();
    let campoActivo = campo;
    let campoRaiz = campo;

    function esFuncion(entrada) {
      return camposFuncion.has(entrada);
    }

    function esCampo(entrada) {
      return entrada?.tagName === "INPUT" && entrada.type === "text" && entrada.form === formulario;
    }

    function guardarPosicion(entrada) {
      if (entrada?.selectionStart !== null && entrada?.selectionStart !== undefined) {
        posiciones.set(entrada, [entrada.selectionStart, entrada.selectionEnd]);
      }
    }

    function seleccion(entrada) {
      const largo = entrada.value.length;
      const [inicio, fin] = posiciones.get(entrada) ?? [entrada.selectionStart ?? largo, entrada.selectionEnd ?? largo];
      return [Math.min(inicio, largo), Math.min(fin, largo)];
    }

    if (formulario) {
      formulario.addEventListener("focusin", evento => {
        if (esCampo(evento.target)) {
          campoActivo = evento.target;
          guardarPosicion(campoActivo);
        }
      });
      for (const tipo of ["click", "keyup", "select", "input"]) {
        formulario.addEventListener(tipo, evento => {
          if (esCampo(evento.target)) {
            campoActivo = evento.target;
            guardarPosicion(campoActivo);
          }
        });
      }
    }

    function insertar(etiqueta, textoElegido = null) {
      const numerico = /^\d$/.test(etiqueta) || etiqueta === "." || etiqueta === "−" || etiqueta === "Limpiar";
      const destino = esCampo(campoActivo) && (numerico || esFuncion(campoActivo)) ? campoActivo : campo;
      const [inicio, fin] = seleccion(destino);
      destino.focus();

      if (etiqueta === "Limpiar") {
        destino.value = "";
        destino.setSelectionRange(0, 0);
      } else if (!esFuncion(destino) && etiqueta === "−") {
        const negativo = destino.value.startsWith("-");
        destino.value = negativo ? destino.value.slice(1) : `-${destino.value}`;
        const mover = posicion => Math.max(0, posicion + (negativo ? -1 : 1));
        destino.setSelectionRange(mover(inicio), mover(fin));
      } else if (!esFuncion(destino) && etiqueta === ".") {
        const restante = destino.value.slice(0, inicio) + destino.value.slice(fin);
        const exponente = restante.search(/[eE]/);
        if (restante.slice(0, exponente < 0 ? undefined : exponente).includes(".") || (exponente >= 0 && inicio > exponente)) {
          destino.setSelectionRange(inicio, fin);
          guardarPosicion(destino);
          return;
        }
        if (restante === "" || restante === "-") {
          destino.value = restante === "-" ? "-0." : "0.";
          destino.setSelectionRange(destino.value.length, destino.value.length);
        } else destino.setRangeText(".", inicio, fin, "end");
      } else {
        const seleccionado = destino.value.slice(inicio, fin);
        const texto = textoElegido ?? inserciones[etiqueta] ?? (funciones.has(etiqueta) ? `${etiqueta}()` : etiqueta);
        const insercion = texto.includes("()") ? texto.replace("()", `(${seleccionado})`) : texto;
        destino.setRangeText(insercion, inicio, fin, "end");
        const posicion = texto.includes("()") && !seleccionado
          ? inicio + texto.indexOf("()") + 1
          : inicio + insercion.length;
        destino.setSelectionRange(posicion, posicion);
      }
      guardarPosicion(destino);
      destino.dispatchEvent(new Event("input", { bubbles: true }));
    }

    campo.setSelectionRange(campo.value.length, campo.value.length);
    contenedor.setAttribute("role", "group");
    contenedor.setAttribute("aria-label", "Teclado para funciones y campos numéricos");
    const tabla = document.createElement("table");
    tabla.setAttribute("align", "center");
    const cuerpo = document.createElement("tbody");
    const panelRaiz = document.createElement("div");
    panelRaiz.hidden = true;
    panelRaiz.setAttribute("align", "center");
    const etiquetaIndice = document.createElement("label");
    etiquetaIndice.textContent = "Índice n: ";
    const campoIndice = document.createElement("input");
    campoIndice.type = "text";
    campoIndice.inputMode = "numeric";
    campoIndice.value = "4";
    etiquetaIndice.append(campoIndice);
    const botonInsertar = document.createElement("button");
    botonInsertar.type = "button";
    botonInsertar.textContent = "Insertar";
    const botonCancelar = document.createElement("button");
    botonCancelar.type = "button";
    botonCancelar.textContent = "Cancelar";
    const aviso = document.createElement("span");
    aviso.setAttribute("role", "alert");
    panelRaiz.append(etiquetaIndice, document.createTextNode(" "), botonInsertar, document.createTextNode(" "), botonCancelar, aviso);
    let seleccionRaiz = [0, 0];

    function cerrarRaiz() {
      panelRaiz.hidden = true;
      aviso.textContent = "";
      campoRaiz.focus();
      campoRaiz.setSelectionRange(...seleccionRaiz);
      guardarPosicion(campoRaiz);
    }

    function confirmarRaiz() {
      const textoIndice = campoIndice.value.trim();
      const indice = Number(textoIndice);
      if (!/^[1-9]\d*$/.test(textoIndice) || !Number.isSafeInteger(indice)) {
        aviso.textContent = " Escribe un índice entero positivo.";
        campoIndice.focus();
        return;
      }
      cerrarRaiz();
      insertar("raíz n", `raiz${indice}()`);
    }

    botonInsertar.addEventListener("click", confirmarRaiz);
    botonCancelar.addEventListener("click", cerrarRaiz);
    campoIndice.addEventListener("keydown", evento => {
      if (evento.key === "Enter") { evento.preventDefault(); confirmarRaiz(); }
      if (evento.key === "Escape") cerrarRaiz();
    });

    for (const etiquetas of filasTeclado) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");
      celda.setAttribute("align", "center");
      celda.setAttribute("nowrap", "");
      for (const etiqueta of etiquetas) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = etiqueta;
        if (etiqueta === "raíz n") {
          boton.addEventListener("pointerdown", () => guardarPosicion(campoActivo));
          boton.addEventListener("mousedown", evento => evento.preventDefault());
          boton.addEventListener("click", () => {
            campoRaiz = esFuncion(campoActivo) ? campoActivo : campo;
            seleccionRaiz = seleccion(campoRaiz);
            aviso.textContent = "";
            panelRaiz.hidden = false;
            campoIndice.focus();
          });
        } else {
          boton.addEventListener("pointerdown", () => guardarPosicion(campoActivo));
          boton.addEventListener("mousedown", evento => evento.preventDefault());
          boton.addEventListener("click", () => insertar(etiqueta));
        }
        celda.append(boton, document.createTextNode(" "));
      }
      fila.append(celda);
      cuerpo.append(fila);
    }
    tabla.append(cuerpo);
    contenedor.append(tabla, panelRaiz);
  });

  const botones = Array.from(document.querySelectorAll("nav button[data-section]"));
  botones.forEach(boton => boton.addEventListener("click", () => {
    botones.forEach(otroBoton => {
      const seleccionado = otroBoton === boton;
      otroBoton.setAttribute("aria-pressed", String(seleccionado));
      document.getElementById(otroBoton.dataset.section).hidden = !seleccionado;
    });
    document.querySelector(`#${boton.dataset.section} h2`).focus();
  }));

  const campoFuncionNewton = document.getElementById("n-f");
  const salidaDerivadaNewton = document.getElementById("derivada-newton");
  function actualizarDerivadaNewton() {
    try {
      salidaDerivadaNewton.textContent = `f'(x) = ${derivarFuncion(leerFuncion(campoFuncionNewton.value)).texto}`;
    } catch (error) {
      salidaDerivadaNewton.textContent = `Derivada: ${error.message}`;
    }
  }
  campoFuncionNewton.addEventListener("input", actualizarDerivadaNewton);
  actualizarDerivadaNewton();

  const campoFuncionPuntoFijo = document.getElementById("p-f");
  const campoIteracionPuntoFijo = document.getElementById("p-g");
  const campoInicialPuntoFijo = document.getElementById("p-x0");
  const opcionPuntoFijo = document.getElementById("p-opcion");
  const salidaFormasPuntoFijo = document.getElementById("formas-punto-fijo");
  function actualizarFormasPuntoFijo() {
    salidaFormasPuntoFijo.replaceChildren();
    opcionPuntoFijo.disabled = Boolean(campoIteracionPuntoFijo.value.trim());
    try {
      if (opcionPuntoFijo.disabled) {
        leerFuncion(campoIteracionPuntoFijo.value);
        const linea = document.createElement("p");
        linea.textContent = `Se usará g(x)=${campoIteracionPuntoFijo.value.trim()}`;
        salidaFormasPuntoFijo.append(linea);
        return;
      }
      if (!campoInicialPuntoFijo.value.trim()) throw new Error("Escribe un valor inicial.");
      const funcionOriginal = leerFuncion(campoFuncionPuntoFijo.value);
      const valorInicial = leerNumero(document.getElementById("form-punto-fijo"), "x0");
      const formas = crearFormasPuntoFijo(funcionOriginal, valorInicial, campoFuncionPuntoFijo.value.trim());
      formas.forEach(forma => {
        const linea = document.createElement("p");
        linea.textContent = forma.texto;
        salidaFormasPuntoFijo.append(linea);
      });
    } catch (error) {
      const aviso = document.createElement("p");
      aviso.textContent = `Formas de g(x): ${error.message}`;
      salidaFormasPuntoFijo.append(aviso);
    }
  }
  campoFuncionPuntoFijo.addEventListener("input", actualizarFormasPuntoFijo);
  campoIteracionPuntoFijo.addEventListener("input", actualizarFormasPuntoFijo);
  campoInicialPuntoFijo.addEventListener("input", actualizarFormasPuntoFijo);
  actualizarFormasPuntoFijo();

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
    leerNumeroOpcional(formulario, "a"), leerNumeroOpcional(formulario, "b"),
    leerNumero(formulario, "tolerancia"), leerNumero(formulario, "maximo")
  ), ["I", "Xi", "Xf", "Xm", "Ea(x)"]);

  prepararFormulario("form-punto-fijo", "resultado-punto-fijo", formulario => {
    const texto = formulario.elements.namedItem("original").value.trim();
    const funcionOriginal = leerFuncion(texto);
    const valorInicial = leerNumero(formulario, "x0");
    const tolerancia = leerNumero(formulario, "tolerancia");
    const maximo = leerNumero(formulario, "maximo");
    const textoIteracion = formulario.elements.namedItem("iteracion").value.trim();
    if (textoIteracion) {
      const resultado = calcularPuntoFijo(leerFuncion(textoIteracion), valorInicial, tolerancia, maximo, funcionOriginal);
      return {
        ...resultado, nombreForma: "g(x)", formaUsada: `g(x)=${textoIteracion}`,
        residuoFinal: Math.abs(funcionOriginal(resultado.raiz))
      };
    }
    return calcularPuntoFijoAutomatico(
      funcionOriginal, valorInicial, tolerancia, maximo, texto, formulario.elements.namedItem("opcion").value
    );
  }, [], (contenedor, resultado) => mostrarTabla(contenedor, resultado, ["n", "X", resultado.nombreForma, "f(x)"]));

  prepararFormulario("form-newton", "resultado-newton", formulario => {
    const funcionOriginal = leerFuncion(formulario.elements.namedItem("funcion").value);
    const valorInicial = leerNumero(formulario, "x0");
    return { ...calcularNewtonRaphson(funcionOriginal, valorInicial, leerNumero(formulario, "tolerancia"), leerNumero(formulario, "maximo")), evaluar: funcionOriginal, valorInicial };
  }, [], mostrarResultadoNewton);
}

if (typeof module !== "undefined") module.exports = { leerFuncion, derivarFuncion, calcularBiseccion, calcularPuntoFijo, crearFormasPuntoFijo, calcularPuntoFijoAutomatico, calcularNewtonRaphson };
