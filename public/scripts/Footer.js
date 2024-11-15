const footer = document.querySelector('.footer');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;

    // Show footer when scrolled to the bottom
    if (scrollTop + windowHeight >= fullHeight - 10) {
        footer.classList.add('visible');
        footer.classList.remove('hidden');
    } else if (scrollTop < lastScroll) {
        // Hide footer when scrolling up
        footer.classList.remove('visible');
        footer.classList.add('hidden');
    }

    lastScroll = scrollTop;
});

