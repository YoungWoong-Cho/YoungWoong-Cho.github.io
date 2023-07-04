import { createTheme } from '@mui/material/styles';
import './styles.css';

const theme = createTheme({
    palette: {
      primary: {
          main: '#7A7067',
          contrastText: '#FFF',
      },
      secondary: {
          light: '#E6DFD9',
          main: '#BFB3A8',
          contrastText: '#FFF',
      },
    },
    typography: {
    //   "fontFamily": `'NanumSquare', sans-serif`
    //   "fontFamily": `'GongGothicMedium', sans-serif`
    "fontFamily": `'SUIT-Regular', sans-serif`
    }
  });

export default theme;