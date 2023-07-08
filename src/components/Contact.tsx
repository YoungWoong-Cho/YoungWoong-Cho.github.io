import ReactMarkdown from "react-markdown";
import contact from "../_posts/contact.md"
import { Box, Typography } from "@mui/material"
import { useEffect, useState } from "react";

const Contact = () => {
  const [markdownContent, setMarkdownContent] = useState('');

  useEffect(() => {
    const fetchMarkdown = async () => {
      const response = await fetch(contact);
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
          <ReactMarkdown>
            {markdownContent}
          </ReactMarkdown>
        </Typography>
      </Box>
    </Box>
  )
}

export default Contact;
