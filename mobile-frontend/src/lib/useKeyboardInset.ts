import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the software keyboard. On iOS the window does not resize, so screens add this
 * inset (or KeyboardAvoidingView padding) to keep the focused field and its button visible.
 * On Android the activity uses adjustResize, so the inset is not added again.
 */
export function useKeyboardInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;
      const onResize = () => {
        const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        setHeight(overlap);
      };
      viewport.addEventListener('resize', onResize);
      viewport.addEventListener('scroll', onResize);
      return () => {
        viewport.removeEventListener('resize', onResize);
        viewport.removeEventListener('scroll', onResize);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return Platform.OS === 'android' ? 0 : height;
}
