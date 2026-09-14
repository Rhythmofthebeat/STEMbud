import unittest
from translator import validate_request

class ValidationTests(unittest.TestCase):
    def test_both_directions(self):
        validate_request("Hindi", "English", text="नमस्ते")
        validate_request("English", "Hindi", audio_path="sample.wav")

    def test_invalid_requests(self):
        for args in [dict(text=" "), dict(text="a", audio_path="a.wav"), dict(text="a" * 1001), {}]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                validate_request("Hindi", "English", **args)

    def test_invalid_languages(self):
        for source, target in [("Hindi", "Hindi"), ("French", "English")]:
            with self.assertRaises(ValueError):
                validate_request(source, target, text="hello")

if __name__ == "__main__":
    unittest.main()
