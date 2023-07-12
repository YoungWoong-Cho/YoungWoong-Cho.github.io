import ReactMarkdown from "react-markdown";
import projects from "../_posts/projects.md"
import { Box, Typography } from "@mui/material"
import { useEffect, useState } from "react";

const PostList = () => {
  const [markdownContent, setMarkdownContent] = useState('');

  useEffect(() => {
    const fetchMarkdown = async () => {
      const response = await fetch(projects);
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
        width: { xs: '90%', md: '60%' },
      }}>
        <Typography>
          <ReactMarkdown
            components={{
              img:({node,...props}) => <img style={{
                maxWidth: '40%',
                float: "right",
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

export default PostList;
