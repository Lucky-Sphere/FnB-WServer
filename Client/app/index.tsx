import { Redirect } from "expo-router";
import { getToken } from "../services/api";

export default function Index() {
  if (getToken()) {
    return <Redirect href="/(tabs)/menu" />;
  }
  return <Redirect href="/(auth)/login" />;
}
