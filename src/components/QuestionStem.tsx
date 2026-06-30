import { parseQuestionStem } from '../utils/htmlText'

type QuestionStemProps = {
  stem: string
  className?: string
  imageClassName?: string
}

export default function QuestionStem({ stem, className = 'question-stem', imageClassName }: QuestionStemProps) {
  const stemParts = parseQuestionStem(stem)
  const blocks = stemParts.blocks.length ? stemParts.blocks : [{ type: 'text' as const, text: stemParts.text }]

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === 'table') {
          return (
            <div className="question-stem-table-wrap" key={`table-${index}`}>
              <table className="question-stem-table">
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={`${index}-header-${headerIndex}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${index}-row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${index}-cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p className="question-stem-text" key={`text-${index}`}>
            {block.text}
          </p>
        )
      })}
      {stemParts.images.map((src) => (
        <img key={src} src={src} alt="Question figure" className={imageClassName} loading="lazy" />
      ))}
    </div>
  )
}
