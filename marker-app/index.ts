import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';

import App from './App';

// فرض اتجاه RTL على مستوى المحرّك — يعكس كل الصفوف والمحاذاة والهوامش
// تلقائيًا (النهج القياسي للتطبيقات العربية) بدل ضبط الاتجاه يدويًا في كل عنصر.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

registerRootComponent(App);
