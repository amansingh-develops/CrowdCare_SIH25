// Global animation configurations for consistent animations across the app
export const animations = {
  // Page transitions
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Card animations
  card: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    hover: {
      y: -5,
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  },

  // Button animations
  button: {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    transition: { duration: 0.2 }
  },

  // Form field animations
  formField: {
    initial: { opacity: 0, x: -10 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { scale: 1.02 },
    transition: { duration: 0.2 }
  },

  // List item animations
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { x: 5, transition: { duration: 0.2 } }
  },

  // Badge animations
  badge: {
    initial: { opacity: 0, scale: 0.8, y: -5 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  },

  // Modal animations
  modal: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  },

  // Stagger animations for lists
  stagger: {
    container: {
      initial: { opacity: 0 },
      animate: { 
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.1
        }
      }
    },
    item: {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" }
      }
    }
  },

  // Loading animations
  loading: {
    spin: {
      animate: { rotate: 360 },
      transition: { duration: 1, repeat: Infinity, ease: "linear" }
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    }
  },

  // Success/Error animations
  notification: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      x: 300, 
      scale: 0.8,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  }
};

// Common transition presets
export const transitions = {
  smooth: { duration: 0.3, ease: "easeOut" },
  quick: { duration: 0.2, ease: "easeOut" },
  slow: { duration: 0.5, ease: "easeOut" },
  bouncy: { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] },
  spring: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
};

// Animation variants for common use cases
export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  }
};
