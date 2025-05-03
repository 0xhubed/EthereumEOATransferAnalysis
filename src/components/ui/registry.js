/**
 * Component registry for 21st.dev shadcn components
 */

export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};