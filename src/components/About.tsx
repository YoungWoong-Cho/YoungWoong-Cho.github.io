import ReactMarkdown from "react-markdown";
import about from "../_posts/about.md"
import { Box, Typography } from "@mui/material"
import { useEffect, useState } from "react";

const About = () => {
  const [markdownContent, setMarkdownContent] = useState('');

  useEffect(() => {
    const fetchMarkdown = async () => {
      const response = await fetch(about);
      const content = await response.text();
      setMarkdownContent(content);
    };
  
    fetchMarkdown();
  })
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    }}>
       <Box sx={{
        width: { xs: '90%', md: '50%' },
      }}>
        <Typography>
          <ReactMarkdown
            components={{
              img:({node,...props}) => <img style={{
                maxWidth: '40%',
                float: "left",
                marginRight: 50
              }}{...props} alt="img" />
            }}
          >
            {markdownContent}
          </ReactMarkdown>
        </Typography>
      </Box>
    </Box>
  )
}

export default About;
