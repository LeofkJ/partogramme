import Reactotron, { networking } from "reactotron-react-native";
import { NativeModules } from "react-native";
import url from "url";

if (__DEV__) {
  const { hostname: host } = url.parse(NativeModules.SourceCode.scriptURL);

  Reactotron.configure({ host, port: 9090 })
    .useReactNative()
    .use(networking())
    .connect();

  Reactotron.clear();
}

export default Reactotron;
