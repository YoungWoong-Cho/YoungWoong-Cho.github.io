import NavigationBar from "./components/NavigationBar";
import theme from "./common/theme";
import { ThemeProvider } from '@emotion/react';
import Post from "./components/Post";

import test from "./_posts/test.json"

function App() {
  return (
    <ThemeProvider theme={theme}>
      <NavigationBar/>
      <Post content={test.content}/>
    </ThemeProvider>
  );
}

export default App;
