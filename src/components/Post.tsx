import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { Box, Typography } from "@mui/material"
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const Post = () => {
  let { postName } = useParams();
  const [postContent, setPostContent] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postModule = await import(`../_posts/${postName}.md`);
        const response = await fetch(postModule.default);
        const content = await response.text();
        setPostContent(content);
      } catch (error) {
        console.error(error);
      }
    };

    fetchPost();
  }, [postName])
  
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    }}>
       <Box sx={{
        width: '50%',
      }}>
        <Typography>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {postContent}
          </ReactMarkdown>
        </Typography>
      </Box>
    </Box>
  )
}

export default Post;
