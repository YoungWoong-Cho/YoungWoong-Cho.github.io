import About from "./components/About";
import NavigationBar from "./components/NavigationBar";
import Post from "./components/Post";
import theme from "./common/theme";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from '@emotion/react';
import Contact from "./components/Contact";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <NavigationBar/>
        <Routes>
          <Route path="/about" element={<About/>} />
          <Route path="/contact" element={<Contact/>} />
          <Route path="/post/:postName" element={<Post />}/>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
