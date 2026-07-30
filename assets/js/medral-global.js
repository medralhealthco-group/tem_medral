function openEnquiryModal() {
  (document.getElementById("enquiry-modal").classList.add("is-open"),
    (document.body.style.overflow = "hidden"));
}
function closeEnquiryModal() {
  (document.getElementById("enquiry-modal").classList.remove("is-open"),
    (document.body.style.overflow = ""));
}
document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("enquiry-modal");
  (overlay &&
    overlay.addEventListener("click", function (e) {
      e.target === overlay && closeEnquiryModal();
    }),
    document.addEventListener("keydown", function (e) {
      e.key === "Escape" && closeEnquiryModal();
    }));
  const track = document.querySelector(".ticker__track");
  if (track) {
    const original = track.innerHTML;
    track.innerHTML = original + original + original;
  }
});
