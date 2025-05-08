import { cn } from "@/lib/utils"

export default function DEADCODELogo(props: { id?: string, className?: string }) {
    const classes = cn("text-lg text-notQuiteBlack dark:text-notQuiteWhite transition-colors duration-300 font-montserrat font-bold", props.className);
    return (<div id={props.id} className={classes}>××</div>)
}