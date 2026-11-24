(() => {
  const main = document.querySelector("main.contenido");
  if (!main) return;

  const titulos = [...main.querySelectorAll("h2")];
  if (titulos.length < 3) return;

  const slug = (texto) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const usados = new Set([...document.querySelectorAll("[id]")].map((el) => el.id));

  const etiqueta = (h) => {
    if (h.dataset.indice) return h.dataset.indice;
    let t = h.textContent.replace(/\s+/g, " ").trim();
    t = t.split("\\(")[0];             
    const corte = t.search(/[.:]\s/);  
    if (corte > 0) t = t.slice(0, corte);
    return t.replace(/[.:\s]+$/, "");
  };

  const indice = document.createElement("details");
  indice.className = "indice";

  const resumen = document.createElement("summary");
  resumen.textContent = `Índice de esta página (${titulos.length})`;

  const lista = document.createElement("ul");

  titulos.forEach((h) => {
    const texto = etiqueta(h) || "Sección";

    if (!h.id) {
      const base = slug(texto) || "seccion";
      let id = base;
      let n = 2;
      while (usados.has(id)) id = `${base}-${n++}`;
      h.id = id;
      usados.add(id);
    }

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = texto;
    li.append(a);
    lista.append(li);
  });

  indice.append(resumen, lista);

  const h1 = main.querySelector("h1");
  if (h1) h1.after(indice);
  else main.prepend(indice);
})();