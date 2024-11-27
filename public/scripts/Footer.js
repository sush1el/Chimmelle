document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.footer');
    const body = document.body;
    const html = document.documentElement;
 
   
    // Add smooth transition to footer
    footer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
 
    footer.style.opacity = '0';
    footer.style.transform = 'translateY(20px)';
 
    
 
    let lastScrollTop = 0;
    let isFooterVisible = false;
 
    window.addEventListener('scroll', () => {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollThreshold = window.innerHeight * 0.5; // Appears after scrolling 50% of viewport height
        const maxScroll = Math.max(
            body.scrollHeight, 
            body.offsetHeight, 
            html.clientHeight, 
            html.scrollHeight, 
            html.offsetHeight
        );
 
        // Check if at bottom of page
        const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
 
        if ((currentScrollTop > scrollThreshold && currentScrollTop > lastScrollTop) || isAtBottom) {
            // Scrolling down past threshold OR at bottom of page
            footer.style.opacity = '1';
            footer.style.transform = 'translateY(0)';
            isFooterVisible = true;
        } else if (currentScrollTop < lastScrollTop && isFooterVisible) {
            // Scrolling up
            footer.style.opacity = '0';
            footer.style.transform = 'translateY(20px)';
            isFooterVisible = false;
        }
 
        lastScrollTop = currentScrollTop;
    });
});