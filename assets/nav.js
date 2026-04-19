// Sticky-header anchor navigation with scroll-spy highlight.
export function initNav() {
  const links = Array.from(document.querySelectorAll(".anchor-nav a"));
  const sections = links
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  const setActive = (id) => {
    links.forEach((l) => l.classList.toggle("active", l.dataset.section === id));
  };

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  sections.forEach((s) => obs.observe(s));

  // Smooth-scroll on click
  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        setActive(id);
      }
    });
  });
}
