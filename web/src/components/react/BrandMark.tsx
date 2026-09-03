import styles from './BrandMark.module.css'

interface Props {
  className?: string
  size?: number
  baseUrl?: string
}

/** 站点品牌标（public/logo.svg） */
export default function BrandMark({ className, size = 28, baseUrl = '/' }: Props) {
  const src = `${baseUrl}logo.svg`
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={[styles.mark, className].filter(Boolean).join(' ')}
      decoding="async"
    />
  )
}
