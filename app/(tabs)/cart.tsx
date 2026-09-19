import { Redirect } from 'expo-router';

/** Keep old cart links compatible without rendering Checkout beneath the tabs. */
export default function CartTabScreen() {
  return <Redirect href="/(app)/cart" />;
}
