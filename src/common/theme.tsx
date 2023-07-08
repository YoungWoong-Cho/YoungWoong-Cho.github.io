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
      "fontFamily": `'GowunBatang', sans-serif`,
      h1: {
        fontSize: 28,
        fontWeight: 700
      },
      h2: {
        fontSize: 24,
        fontWeight: 700
      },
      h3: {
        fontSize: 20,
        fontWeight: 500
      },
      h4: {
        fontSize: 18,
        fontWeight: 500
      },
      h5: {
        fontSize: 16,
        fontWeight: 300
      },
      h6: {
        fontSize: 14,
        fontWeight: 300
      },
      body1: {
        fontSize: 16,
        fontWeight: 500
      },
      body2: {
        fontSize: 14,
        fontWeight: 300
      },
      button: {
        textTransform: 'none',
        fontSize: 14,
        fontWeight: 300,
      }
    }
  });

export default theme;