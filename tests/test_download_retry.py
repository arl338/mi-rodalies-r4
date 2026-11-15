"""Official GTFS download retries are bounded and never accept bad bytes."""
import io
import sys
import unittest
import urllib.error
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_network

def zip_bytes():
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
        z.writestr('manifest.txt','verified test data')
    return out.getvalue()

class DownloadRetries(unittest.TestCase):
    @patch('build_network.clock.sleep')
    @patch('build_network.urllib.request.urlopen')
    def test_transient_503_retries_then_downloads(self,open_url,sleep):
        error=urllib.error.HTTPError('https://example.test',503,'unavailable',None,None)
        valid=zip_bytes()
        open_url.side_effect=[error,io.BytesIO(valid)]
        self.assertEqual(build_network.download('https://example.test'),valid)
        self.assertEqual(open_url.call_count,2)
        sleep.assert_called_once_with(3)
    @patch('build_network.clock.sleep')
    @patch('build_network.urllib.request.urlopen')
    def test_permanent_http_404_fails_immediately(self,open_url,sleep):
        open_url.side_effect=urllib.error.HTTPError('https://example.test',404,'not found',None,None)
        with self.assertRaises(urllib.error.HTTPError):
            build_network.download('https://example.test')
        open_url.assert_called_once()
        sleep.assert_not_called()
    @patch('build_network.clock.sleep')
    @patch('build_network.urllib.request.urlopen')
    def test_invalid_bytes_fail_not_publish(self,open_url,sleep):
        open_url.return_value=io.BytesIO(b'<html>HTTP 200 but not a GTFS archive</html>')
        with self.assertRaisesRegex(ValueError,'did not return ZIP'):
            build_network.download('https://example.test')
        open_url.assert_called_once()
        sleep.assert_not_called()
    @patch('build_network.clock.sleep')
    @patch('build_network.urllib.request.urlopen')
    def test_three_timeouts_are_not_silently_ignored(self,open_url,sleep):
        open_url.side_effect=TimeoutError('connection timeout')
        with self.assertRaises(TimeoutError):
            build_network.download('https://example.test')
        self.assertEqual(open_url.call_count,3)
        self.assertEqual(sleep.call_count,2)

if __name__=='__main__':
    unittest.main()
