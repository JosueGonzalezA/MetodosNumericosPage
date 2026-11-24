"use strict";

const METODOS_ADICIONALES = (() => {
  const herramientas = typeof module !== "undefined" && module.exports
    ? require("./app.js")
    : globalThis;
  const { leerFuncion, derivarFuncion } = herramientas;

  function numeroFinito(valor, nombre) {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      throw new Error(`${nombre} debe ser un número finito.`);
    }
    return valor;
  }

  function resultadoFinito(valor) {
    if (!Number.isFinite(valor)) {
      throw new Error("El cálculo produjo un valor fuera de los números reales finitos.");
    }
    return valor;
  }

  function revisarFuncion(texto) {
    if (typeof leerFuncion !== "function" || typeof derivarFuncion !== "function") {
      throw new Error("No se cargaron las funciones de la calculadora.");
    }
    if (typeof texto !== "string" || !texto.trim()) {
      throw new Error("Escribe una función.");
    }
    return leerFuncion(texto);
  }

  function calcularError(aproximacion, exacto) {
    if (exacto === null) return { errorAbsoluto: null, errorPorcentual: null };
    const errorAbsoluto = Math.abs(exacto - aproximacion);
    return {
      errorAbsoluto: resultadoFinito(errorAbsoluto),
      errorPorcentual: exacto === 0 ? null : resultadoFinito(errorAbsoluto / Math.abs(exacto) * 100)
    };
  }

  function revisarDosPuntos(x0, y0, x1, y1) {
    numeroFinito(x0, "x₀");
    numeroFinito(y0, "y₀");
    numeroFinito(x1, "x₁");
    numeroFinito(y1, "y₁");
    if (x0 === x1) throw new Error("Los valores de x deben ser distintos.");
  }

  function serieDeTaylor(arbol, centro, ordenMaximo) {
    const constante = valor => [valor, ...Array(ordenMaximo).fill(0)];
    const revisar = serie => serie.map(resultadoFinito);
    const sumar = (a, b) => revisar(a.map((valor, indice) => valor + b[indice]));
    const restar = (a, b) => revisar(a.map((valor, indice) => valor - b[indice]));
    const multiplicar = (a, b) => revisar(a.map((_, indice) => {
      let suma = 0;
      for (let i = 0; i <= indice; i++) suma += a[i] * b[indice - i];
      return suma;
    }));
    const dividir = (a, b) => {
      if (b[0] === 0) throw new Error("La función no tiene derivadas finitas en el centro elegido.");
      const salida = constante(0);
      for (let indice = 0; indice <= ordenMaximo; indice++) {
        let suma = a[indice];
        for (let i = 1; i <= indice; i++) suma -= b[i] * salida[indice - i];
        salida[indice] = resultadoFinito(suma / b[0]);
      }
      return salida;
    };
    const potenciaNormalizada = (a, exponente, valorInicial) => {
      if (a[0] === 0) throw new Error("La función no tiene derivadas finitas en el centro elegido.");
      const cambio = a.map((valor, indice) => indice === 0 ? 0 : valor / a[0]);
      const salida = constante(valorInicial);
      let termino = constante(1);
      let coeficiente = 1;
      for (let orden = 1; orden <= ordenMaximo; orden++) {
        termino = multiplicar(termino, cambio);
        coeficiente *= (exponente - orden + 1) / orden;
        for (let indice = 0; indice <= ordenMaximo; indice++) {
          salida[indice] += valorInicial * coeficiente * termino[indice];
        }
      }
      return revisar(salida);
    };
    const potenciaEntera = (a, exponente) => {
      if (exponente < 0) return dividir(constante(1), potenciaEntera(a, -exponente));
      let resultado = constante(1);
      let base = a;
      while (exponente > 0) {
        if (exponente % 2 === 1) resultado = multiplicar(resultado, base);
        exponente = Math.floor(exponente / 2);
        if (exponente > 0) base = multiplicar(base, base);
      }
      return resultado;
    };
    const logaritmo = a => {
      if (a[0] <= 0) throw new Error("El logaritmo no tiene derivadas reales en el centro elegido.");
      const cambio = a.map((valor, indice) => indice === 0 ? 0 : valor / a[0]);
      const salida = constante(Math.log(a[0]));
      let termino = constante(1);
      for (let orden = 1; orden <= ordenMaximo; orden++) {
        termino = multiplicar(termino, cambio);
        const factor = (orden % 2 === 1 ? 1 : -1) / orden;
        for (let indice = 0; indice <= ordenMaximo; indice++) salida[indice] += factor * termino[indice];
      }
      return revisar(salida);
    };
    const exponencial = a => {
      const salida = constante(Math.exp(a[0]));
      for (let orden = 1; orden <= ordenMaximo; orden++) {
        let suma = 0;
        for (let i = 1; i <= orden; i++) suma += i * a[i] * salida[orden - i];
        salida[orden] = resultadoFinito(suma / orden);
      }
      return revisar(salida);
    };
    const senoCoseno = a => {
      const seno = constante(Math.sin(a[0]));
      const coseno = constante(Math.cos(a[0]));
      for (let orden = 1; orden <= ordenMaximo; orden++) {
        let sumaSeno = 0;
        let sumaCoseno = 0;
        for (let i = 1; i <= orden; i++) {
          sumaSeno += i * a[i] * coseno[orden - i];
          sumaCoseno -= i * a[i] * seno[orden - i];
        }
        seno[orden] = resultadoFinito(sumaSeno / orden);
        coseno[orden] = resultadoFinito(sumaCoseno / orden);
      }
      return { seno, coseno };
    };
    const raiz = (a, grado) => {
      if (!Number.isSafeInteger(grado) || grado < 1) {
        throw new Error("El índice de la raíz debe ser un entero positivo.");
      }
      if (grado === 1) return a;
      if (a[0] < 0 && grado % 2 === 0) {
        throw new Error("La raíz de índice par no es real en el centro elegido.");
      }
      const inicial = a[0] < 0 ? -Math.pow(-a[0], 1 / grado) : Math.pow(a[0], 1 / grado);
      if (ordenMaximo === 0) return constante(inicial);
      return potenciaNormalizada(a, 1 / grado, inicial);
    };
    const integrarDerivada = (a, valorInicial) => {
      const salida = constante(valorInicial);
      for (let orden = 1; orden <= ordenMaximo; orden++) {
        salida[orden] = resultadoFinito(a[orden - 1] / orden);
      }
      return salida;
    };
    const derivar = a => a.map((_, indice) => indice === ordenMaximo ? 0 : (indice + 1) * a[indice + 1]);

    function evaluar(nodo) {
      if (nodo.tipo === "numero") return constante(nodo.valor);
      if (nodo.tipo === "variable") {
        const variable = constante(centro);
        if (ordenMaximo > 0) variable[1] = 1;
        return variable;
      }
      if (nodo.tipo === "negativo") return multiplicar(constante(-1), evaluar(nodo.argumento));
      if (nodo.tipo === "operacion") {
        const a = evaluar(nodo.izquierda);
        const b = evaluar(nodo.derecha);
        if (nodo.simbolo === "+") return sumar(a, b);
        if (nodo.simbolo === "-") return restar(a, b);
        if (nodo.simbolo === "*") return multiplicar(a, b);
        if (nodo.simbolo === "/") return dividir(a, b);
        if (b.slice(1).every(valor => valor === 0)) {
          if (Number.isSafeInteger(b[0])) return potenciaEntera(a, b[0]);
          if (a[0] > 0) return potenciaNormalizada(a, b[0], Math.pow(a[0], b[0]));
        }
        return exponencial(multiplicar(b, logaritmo(a)));
      }

      const argumento = evaluar(nodo.argumento);
      const nombre = nodo.nombre;
      if (nodo.indice) {
        const indice = evaluar(nodo.indice);
        if (indice.slice(1).some(valor => valor !== 0)) {
          throw new Error("El índice de la raíz debe ser constante cerca del centro.");
        }
        return raiz(argumento, indice[0]);
      }
      const raizConIndice = /^raiz(\d+)$/.exec(nombre);
      if (nombre === "raiz" || raizConIndice) {
        return raiz(argumento, raizConIndice ? Number(raizConIndice[1]) : 2);
      }
      const baseLogaritmo = /^log(\d+)$/.exec(nombre);
      if (baseLogaritmo) return dividir(logaritmo(argumento), constante(Math.log(Number(baseLogaritmo[1]))));
      if (nombre === "ln" || nombre === "log") return logaritmo(argumento);
      if (nombre === "log10") return dividir(logaritmo(argumento), constante(Math.LN10));
      if (nombre === "exp") return exponencial(argumento);
      if (nombre === "sen") return senoCoseno(argumento).seno;
      if (nombre === "cos") return senoCoseno(argumento).coseno;
      if (nombre === "tan") {
        const par = senoCoseno(argumento);
        return dividir(par.seno, par.coseno);
      }
      if (nombre === "arcsen" || nombre === "arccos") {
        const valor = nombre === "arcsen" ? Math.asin(argumento[0]) : Math.acos(argumento[0]);
        if (ordenMaximo === 0) return constante(resultadoFinito(valor));
        const denominador = raiz(restar(constante(1), multiplicar(argumento, argumento)), 2);
        const derivada = dividir(derivar(argumento), denominador);
        return integrarDerivada(nombre === "arcsen" ? derivada : multiplicar(constante(-1), derivada), valor);
      }
      if (nombre === "arctan") {
        const derivada = dividir(derivar(argumento), sumar(constante(1), multiplicar(argumento, argumento)));
        return integrarDerivada(derivada, Math.atan(argumento[0]));
      }
      if (nombre === "absoluto") {
        let signo = Math.sign(argumento[0]);
        if (signo === 0) {
          const primerOrden = argumento.findIndex((valor, indice) => indice > 0 && valor !== 0);
          if (primerOrden < 0) return constante(0);
          if (primerOrden % 2 === 1) {
            throw new Error("El valor absoluto no tiene derivadas de ese orden en el centro.");
          }
          signo = Math.sign(argumento[primerOrden]);
        }
        return multiplicar(constante(signo), argumento);
      }
      throw new Error(`No puedo calcular la serie de ${nombre}.`);
    }

    return revisar(evaluar(arbol));
  }

  function resolverTaylor(textoFuncion, centro, paso, ordenMaximo) {
    numeroFinito(centro, "El centro");
    numeroFinito(paso, "El paso");
    if (!Number.isInteger(ordenMaximo) || ordenMaximo < 0 || ordenMaximo > 8) {
      throw new Error("El orden de Taylor debe ser un entero de 0 a 8.");
    }
    const punto = resultadoFinito(centro + paso);
    const funcionOriginal = revisarFuncion(textoFuncion);
    const valorExacto = funcionOriginal(punto);
    const coeficientes = serieDeTaylor(funcionOriginal.arbol, centro, ordenMaximo);
    const filas = [];
    let funcionParaTexto = funcionOriginal;
    let textoDerivada = textoFuncion.trim();
    let factorial = 1;
    let potenciaPaso = 1;
    let aproximacion = 0;
    let expresionDisponible = true;

    for (let orden = 0; orden <= ordenMaximo; orden++) {
      if (orden > 0) {
        if (expresionDisponible) {
          try {
            const derivada = derivarFuncion(funcionParaTexto);
            if (derivada.texto.length > 5000) throw new Error("La expresión es demasiado larga.");
            const siguiente = leerFuncion(derivada.texto);
            textoDerivada = derivada.texto;
            funcionParaTexto = siguiente;
          } catch {
            expresionDisponible = false;
          }
        }
        if (!expresionDisponible) textoDerivada = `d^${orden}/dx^${orden}(${textoFuncion.trim()})`;
        factorial *= orden;
        potenciaPaso *= paso;
      }
      const valorDerivada = resultadoFinito(coeficientes[orden] * factorial);
      const termino = resultadoFinito(coeficientes[orden] * potenciaPaso);
      aproximacion = resultadoFinito(aproximacion + termino);
      filas.push({
        orden,
        derivada: textoDerivada,
        valorDerivada,
        termino,
        aproximacion,
        ...calcularError(aproximacion, valorExacto)
      });
    }
    return { punto, valorExacto, filas };
  }

  function resolverLagrangeLineal(x0, y0, x1, y1, x) {
    revisarDosPuntos(x0, y0, x1, y1);
    const pendiente = resultadoFinito((y1 - y0) / (x1 - x0));
    if (x === null) {
      return {
        base0: null, base1: null, termino0: null, termino1: null,
        resultado: null, pendiente
      };
    }
    numeroFinito(x, "x");
    const base0 = resultadoFinito((x - x1) / (x0 - x1));
    const base1 = resultadoFinito((x - x0) / (x1 - x0));
    const termino0 = resultadoFinito(y0 * base0);
    const termino1 = resultadoFinito(y1 * base1);
    const resultado = resultadoFinito(termino0 + termino1);
    return { base0, base1, termino0, termino1, resultado, pendiente };
  }

  function resolverSimpson(textoFuncion, a, b, n, valorExacto = null) {
    numeroFinito(a, "El límite inferior");
    numeroFinito(b, "El límite superior");
    if (a === b) throw new Error("Los límites de integración deben ser distintos.");
    if (!Number.isInteger(n) || n < 2 || n > 500 || n % 2 !== 0) {
      throw new Error("El número de subintervalos debe ser par, entre 2 y 500.");
    }
    if (valorExacto !== null) numeroFinito(valorExacto, "El valor exacto");
    const funcion = revisarFuncion(textoFuncion);
    const paso = resultadoFinito((b - a) / n);
    const filas = [];
    let suma = 0;
    let compensacion = 0;
    for (let indice = 0; indice <= n; indice++) {
      const x = indice === n ? b : resultadoFinito(a + indice * paso);
      const valor = funcion(x);
      const coeficiente = indice === 0 || indice === n ? 1 : indice % 2 === 1 ? 4 : 2;
      const producto = resultadoFinito(coeficiente * valor);
      const sumando = producto - compensacion;
      const nuevaSuma = suma + sumando;
      compensacion = (nuevaSuma - suma) - sumando;
      suma = resultadoFinito(nuevaSuma);
      filas.push({ indice, x, valor, coeficiente, producto });
    }
    const resultado = resultadoFinito(paso / 3 * suma);
    return { paso, filas, suma, resultado, valorExacto, ...calcularError(resultado, valorExacto) };
  }

  function resolverSimpsonAutomatico(textoFuncion, a, b, tolerancia, valorExacto = null, nInicial = 2) {
    numeroFinito(tolerancia, "La tolerancia");
    if (tolerancia <= 0) throw new Error("La tolerancia debe ser mayor que cero.");
    if (!Number.isInteger(nInicial) || nInicial < 2 || nInicial > 500 || nInicial % 2 !== 0) {
      throw new Error("El número inicial de subintervalos debe ser par, entre 2 y 500.");
    }
    if (nInicial > 250) throw new Error("Para elegir n automáticamente, el número inicial debe ser como máximo 250.");
    const historial = [];
    let anterior = null;
    let ultimo = null;
    let errorEstimado = null;
    let ultimoN = nInicial;

    for (let n = nInicial; n <= 500; n *= 2) {
      ultimo = resolverSimpson(textoFuncion, a, b, n, valorExacto);
      ultimoN = n;
      errorEstimado = anterior === null
        ? null
        : resultadoFinito(Math.abs(ultimo.resultado - anterior) / 15);
      let discrepanciaAlterna = null;
      if (errorEstimado !== null && errorEstimado <= tolerancia) {
        const otrosN = [2, 6, 10].map(diferencia => n + diferencia <= 500 ? n + diferencia : n - diferencia);
        discrepanciaAlterna = Math.max(...otrosN.map(nAlterno => {
          const alterno = resolverSimpson(textoFuncion, a, b, nAlterno, valorExacto);
          return resultadoFinito(Math.abs(alterno.resultado - ultimo.resultado));
        }));
        if (discrepanciaAlterna <= tolerancia) {
          historial.push({ n, resultado: ultimo.resultado, errorEstimado, discrepanciaAlterna });
          return { ...ultimo, n, errorEstimado, discrepanciaAlterna, historial, convergio: true };
        }
      }
      historial.push({ n, resultado: ultimo.resultado, errorEstimado, discrepanciaAlterna });
      anterior = ultimo.resultado;
    }

    return { ...ultimo, n: ultimoN, errorEstimado, historial, convergio: false };
  }

  function resolverInterpolacionLineal(x0, y0, x1, y1, xSolicitada = null, ySolicitada = null) {
    revisarDosPuntos(x0, y0, x1, y1);
    if (xSolicitada !== null) numeroFinito(xSolicitada, "x solicitada");
    if (ySolicitada !== null) numeroFinito(ySolicitada, "y solicitada");
    const pendiente = resultadoFinito((y1 - y0) / (x1 - x0));
    const interseccion = resultadoFinito(y0 - pendiente * x0);
    const resultadoY = xSolicitada === null
      ? null
      : resultadoFinito(y0 + pendiente * (xSolicitada - x0));
    let resultadoX = null;
    let errorInverso = null;
    if (ySolicitada !== null) {
      if (pendiente === 0) {
        if (xSolicitada === null) {
          throw new Error("La recta es horizontal: no se puede hallar un único valor de x.");
        }
        errorInverso = ySolicitada === y0
          ? "Todos los valores de x producen ese valor de y; no hay una x única."
          : "No existe un valor de x para ese valor de y en esta recta horizontal.";
      } else {
        resultadoX = resultadoFinito(x0 + (ySolicitada - y0) / pendiente);
      }
    }
    return { pendiente, interseccion, resultadoY, resultadoX, errorInverso };
  }

  function resolverPolinomial(puntos, x) {
    if (!Array.isArray(puntos) || puntos.length < 2 || puntos.length > 12) {
      throw new Error("Escribe entre 2 y 12 puntos.");
    }
    if (x !== null) numeroFinito(x, "x");
    puntos.forEach((punto, indice) => {
      if (!punto || typeof punto !== "object") throw new Error(`El punto ${indice + 1} no es válido.`);
      numeroFinito(punto.x, `x del punto ${indice + 1}`);
      numeroFinito(punto.y, `y del punto ${indice + 1}`);
    });
    if (new Set(puntos.map(punto => punto.x)).size !== puntos.length) {
      throw new Error("Los valores de x de los puntos deben ser distintos.");
    }

    const grado = puntos.length - 1;
    const coeficientes = Array(puntos.length).fill(0);
    const magnitudes = Array(puntos.length).fill(0);
    const filas = [];
    let resultado = x === null ? null : 0;

    puntos.forEach((punto, indice) => {
      let denominador = 1;
      let numerador = 1;
      let polinomioBase = [1];
      puntos.forEach((otro, segundoIndice) => {
        if (indice === segundoIndice) return;
        denominador = resultadoFinito(denominador * (punto.x - otro.x));
        if (x !== null) numerador = resultadoFinito(numerador * (x - otro.x));
        const siguiente = Array(polinomioBase.length + 1).fill(0);
        polinomioBase.forEach((coeficiente, posicion) => {
          siguiente[posicion] += -otro.x * coeficiente;
          siguiente[posicion + 1] += coeficiente;
        });
        polinomioBase = siguiente.map(resultadoFinito);
      });
      const base = x === null ? null : resultadoFinito(numerador / denominador);
      const termino = x === null ? null : resultadoFinito(punto.y * base);
      if (x !== null) resultado = resultadoFinito(resultado + termino);
      const escala = resultadoFinito(punto.y / denominador);
      polinomioBase.forEach((coeficiente, posicion) => {
        const aporte = resultadoFinito(escala * coeficiente);
        coeficientes[posicion] = resultadoFinito(coeficientes[posicion] + aporte);
        magnitudes[posicion] = resultadoFinito(magnitudes[posicion] + Math.abs(aporte));
      });
      filas.push({ indice, x: punto.x, y: punto.y, denominador, base, termino });
    });

    coeficientes.forEach((coeficiente, indice) => {
      if (Math.abs(coeficiente) <= 32 * Number.EPSILON * magnitudes[indice]) {
        coeficientes[indice] = 0;
      }
    });
    return { grado, filas, coeficientes, resultado };
  }

  return {
    resolverTaylor,
    resolverLagrangeLineal,
    resolverSimpson,
    resolverSimpsonAutomatico,
    resolverInterpolacionLineal,
    resolverPolinomial
  };
})();

if (typeof window !== "undefined") window.METODOS_ADICIONALES = METODOS_ADICIONALES;
if (typeof module !== "undefined" && module.exports) module.exports = METODOS_ADICIONALES;
