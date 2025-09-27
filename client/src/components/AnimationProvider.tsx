import React, { createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animations, transitions, variants } from '@/lib/animations';

interface AnimationContextType {
  animations: typeof animations;
  transitions: typeof transitions;
  variants: typeof variants;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: ReactNode;
}

export function AnimationProvider({ children }: AnimationProviderProps) {
  const value = {
    animations,
    transitions,
    variants
  };

  return (
    <AnimationContext.Provider value={value}>
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </AnimationContext.Provider>
  );
}

// Higher-order component for page animations
export function withPageAnimation<T extends object>(
  Component: React.ComponentType<T>,
  animationType: keyof typeof variants = 'slideUp'
) {
  return function AnimatedPage(props: T) {
    const { variants: animationVariants } = useAnimations();
    
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={animationVariants[animationType]}
        transition={transitions.smooth}
        className="w-full"
      >
        <Component {...props} />
      </motion.div>
    );
  };
}

// Reusable animated components
export const AnimatedCard = motion.div;
export const AnimatedButton = motion.button;
export const AnimatedInput = motion.input;
export const AnimatedText = motion.span;
export const AnimatedDiv = motion.div;
export const AnimatedSection = motion.section;
export const AnimatedHeader = motion.header;
export const AnimatedFooter = motion.footer;
export const AnimatedMain = motion.main;
export const AnimatedNav = motion.nav;
export const AnimatedArticle = motion.article;
export const AnimatedAside = motion.aside;

// Pre-configured animated components with common props
export const FadeInCard = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={transitions.smooth}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const SlideInFromLeft = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={transitions.smooth}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const SlideInFromRight = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={transitions.smooth}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const ScaleIn = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={transitions.bouncy}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const StaggerContainer = ({ children, className, ...props }: any) => (
  <motion.div
    initial="initial"
    animate="animate"
    variants={animations.stagger.container}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className, ...props }: any) => (
  <motion.div
    variants={animations.stagger.item}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);
