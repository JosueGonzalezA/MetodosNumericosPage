"use strict";

if (typeof document !== "undefined") {
  document.querySelectorAll("[data-teclado-numerico]").forEach(teclado => {
    const formulario = teclado.closest("form");
    const posiciones = new WeakMap();
    let campoActivo = null;

    teclado.setAttribute("role", "group");
    teclado.setAttribute("aria-label", "Teclado numérico para el campo seleccionado");

    const tabla = document.createElement("table");
    tabla.setAttribute("align", "center");
    const cuerpo = document.createElement("tbody");
    const estado = document.createElement("output");
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");

    function esCampo(campo) {
      return campo?.tagName === "INPUT" && campo.type === "text" && formulario.contains(campo);
    }

    function guardarPosicion(campo) {
      if (!esCampo(campo)) return;
      posiciones.set(campo, [campo.selectionStart ?? campo.value.length, campo.selectionEnd ?? campo.value.length]);
    }

    function campoSeleccionado() {
      if (!esCampo(campoActivo)) {
        campoActivo = formulario.querySelector('input[type="text"]');
        if (campoActivo) posiciones.set(campoActivo, [campoActivo.value.length, campoActivo.value.length]);
      }
      return campoActivo;
    }

    function nombreCampo(campo) {
      return campo.getAttribute("aria-label") || campo.labels?.[0]?.textContent.trim() || campo.name || "campo numérico";
    }

    function actualizarEstado() {
      const campo = campoSeleccionado();
      if (campo) estado.textContent = `Campo seleccionado: ${nombreCampo(campo)}.`;
    }

    formulario.addEventListener("focusin", evento => {
      if (!esCampo(evento.target)) return;
      campoActivo = evento.target;
      guardarPosicion(campoActivo);
      actualizarEstado();
    });

    for (const tipo of ["click", "keyup", "select", "input"]) {
      formulario.addEventListener(tipo, evento => {
        if (!esCampo(evento.target)) return;
        campoActivo = evento.target;
        guardarPosicion(campoActivo);
        actualizarEstado();
      });
    }

    function pulsar(tecla) {
      const campo = campoSeleccionado();
      if (!campo) return;

      const largo = campo.value.length;
      const [inicioGuardado, finGuardado] = posiciones.get(campo) ?? [largo, largo];
      const inicio = Math.min(inicioGuardado, largo);
      const fin = Math.min(finGuardado, largo);
      campo.focus({ preventScroll: true });

      if (tecla === "Limpiar") {
        campo.value = "";
        campo.setSelectionRange(0, 0);
      } else if (tecla === "−") {
        const negativo = campo.value.startsWith("-");
        campo.value = negativo ? campo.value.slice(1) : `-${campo.value}`;
        const mover = posicion => Math.max(0, posicion + (negativo ? -1 : 1));
        campo.setSelectionRange(mover(inicio), mover(fin));
      } else {
        const restante = campo.value.slice(0, inicio) + campo.value.slice(fin);
        if (tecla === "." && (restante.includes(".") || (/[eE]/.test(restante) && inicio > restante.search(/[eE]/)))) {
          campo.setSelectionRange(inicio, fin);
          guardarPosicion(campo);
          return;
        }
        const soloSigno = tecla === "." && (restante === "" || restante === "-");
        if (soloSigno) {
          campo.value = restante === "-" ? "-0." : "0.";
          campo.setSelectionRange(campo.value.length, campo.value.length);
        } else {
          campo.setRangeText(tecla, inicio, fin, "end");
        }
      }

      guardarPosicion(campo);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    }

    for (const filaTeclas of [["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."], ["−", "Limpiar"]]) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");
      celda.setAttribute("align", "center");
      celda.setAttribute("nowrap", "");
      for (const tecla of filaTeclas) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = tecla;
        if (tecla === "−") boton.setAttribute("aria-label", "Cambiar signo");
        boton.addEventListener("pointerdown", () => guardarPosicion(campoActivo));
        boton.addEventListener("mousedown", evento => evento.preventDefault());
        boton.addEventListener("click", () => pulsar(tecla));
        celda.append(boton, document.createTextNode(" "));
      }
      fila.append(celda);
      cuerpo.append(fila);
    }
    tabla.append(cuerpo);
    teclado.append(tabla, estado);
    actualizarEstado();
  });
}
