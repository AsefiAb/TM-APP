import { Redirect } from "expo-router";

/** Unknown routes land on the dashboard instead of a generic error page. */
export default function NotFound() {
  return <Redirect href="/" />;
}
