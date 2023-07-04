import { Box, Typography } from "@mui/material"

const Post = (props: {
    content: string
}) => {
    return (
        <Box sx={{
            width: '80%'
        }}>
            <Typography sx={{
                fontSize: 14,
                fontWeight: 500
            }}>
                {props.content}
            </Typography>
        </Box>
    )
}

export default Post;
