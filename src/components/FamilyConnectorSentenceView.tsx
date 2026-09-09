import BusManifestReviewView, {
  type BusManifestReviewViewProps,
} from './BusManifestReviewView'

type Props = BusManifestReviewViewProps

/**
 * The sole learner-facing sentence surface. Website, Sentence Structures, and
 * the Connectors workshop cannot select different connector interpreters.
 */
export default function FamilyConnectorSentenceView(props: Props) {
  return <BusManifestReviewView {...props} />
}
