import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Heading,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import validator from "validator";
import { useToast } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [emailError, setEmailError] = useState("");
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "email") {
      if (!validator.isEmail(value)) {
        setEmailError("Invalid email format");
      } else {
        setEmailError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validator.isEmail(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, formData);

      toast({
        title: response.data.message,
        description: "Welcome back!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      console.log("Login response:", response);
      navigate("./dashboard");
    } catch (err) {
      console.log("Login error:", err);

      toast({
        title: err.response?.data?.message || "Error",
        description: "Please try again.",
        status: err.response?.status === 400 ? "warning" : "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <Stack spacing={8} mx="auto" maxW="lg" py={12} px={6}>
        <Stack align="center">
          <Heading fontSize="4xl">Sign in to your account</Heading>
        </Stack>
        <Box
          rounded="lg"
          bg={useColorModeValue("white", "gray.700")}
          boxShadow="lg"
          p={8}
        >
          {/* Form starts here */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* Email Input */}
              <FormControl id="email" isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {emailError && <Text color="red.500">{emailError}</Text>}
              </FormControl>

              {/* Password Input */}
              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </FormControl>

              {/* Signup Link */}
              <Stack spacing={2}>
                <Link to="/register">
                  <Text color="blue.400" textAlign="center">
                    Don&apos;t have an account? Sign up
                  </Text>
                </Link>
              </Stack>

              {/* Submit Button */}
              <Button
                type="submit"
                bg="blue.400"
                color="white"
                _hover={{ bg: "blue.500" }}
              >
                Sign in
              </Button>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Flex>
  );
}
