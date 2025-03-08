"use client";

import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Button,
  Heading,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { Link } from "react-router-dom";
import axios from "axios";
import validator from "validator";

export default function SignupForm() {
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
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

    // **Final email validation before sending request**
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
      const response = await axios.post(`${API_BASE_URL}/signup`, formData);

      toast({
        title: "Signup Successful",
        description: "You have successfully registered.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });

      console.log("response:", response);
    } catch (err) {
      console.log("error:", err);

      if (err.response && err.response.status === 400) {
        toast({
          title: "User Already Registered",
          description: "An account with this email already exists.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      } else {
        toast({
          title: "Signup Failed",
          description: "Something went wrong. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }
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
          <Heading fontSize="4xl" textAlign="center">
            Sign Up
          </Heading>
        </Stack>
        <Box
          rounded="lg"
          bg={useColorModeValue("white", "gray.700")}
          boxShadow="lg"
          p={8}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* Name Input */}
              <FormControl id="name" isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </FormControl>

              {/* Email Input with Validation */}
              <FormControl id="email" isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {emailError && <Text color="red.500">{emailError}</Text>}{" "}
                {/* Show error if invalid */}
              </FormControl>

              {/* Password Input */}
              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <InputRightElement h="full">
                    <Button
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {/* Submit Button */}
              <Stack spacing={10} pt={2}>
                <Button
                  type="submit"
                  size="lg"
                  bg="blue.400"
                  color="white"
                  _hover={{ bg: "blue.500" }}
                >
                  Sign Up
                </Button>
              </Stack>

              {/* Login Link */}
              <Stack pt={4}>
                <Text align="center">
                  Already a user?{" "}
                  <Link to="/">
                    <Text as="span" color="blue.400">
                      Login
                    </Text>
                  </Link>
                </Text>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Flex>
  );
}
