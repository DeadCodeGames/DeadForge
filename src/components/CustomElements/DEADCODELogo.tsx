import React from "react";
import { cn } from "@/lib/utils"

const DEADCODELogo = (props: { id?: string, className?: string, style?: React.CSSProperties }) => {
    const classes = cn("text-lg text-notQuiteBlack dark:text-notQuiteWhite transition-colors duration-300 font-montserrat font-bold", props.className);
    return (<div id={props.id} className={classes} style={props.style}>××</div>)
}

export default DEADCODELogo;